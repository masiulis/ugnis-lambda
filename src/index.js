/*
 * Hi, ugnis editor is being rewritten on ugnis, so please don't create pull requests trying to improve this code
 */

function updateProps(oldVnode, vnode) {
    let key, cur, old, elm = vnode.elm,
        props = vnode.data.liveProps || {};
    for (key in props) {
        cur = props[key];
        old = elm[key];
        if (old !== cur) elm[key] = cur;
    }
}
const livePropsPlugin = {create: updateProps, update: updateProps};
import snabbdom from "snabbdom"
import h from "snabbdom/h"
const patch = snabbdom.init([
    require('snabbdom/modules/class'),
    require('snabbdom/modules/props'),
    require('snabbdom/modules/style'),
    require('snabbdom/modules/eventlisteners'),
    require('snabbdom/modules/attributes'),
    livePropsPlugin
]);

function uuid(){return(""+1e7+-1e3+-4e3+-8e3+-1e11).replace(/[10]/g,function(){return(0|Math.random()*16).toString(16)})}
import big from '../node_modules/big.js'
big.E_POS = 1e+6

import ugnis from './ugnis'
import savedApp from '../ugnis_components/app.json'

function moveInArray (array, moveIndex, toIndex) {
    let item = array[moveIndex];
    let length = array.length;
    let diff = moveIndex - toIndex;

    if (diff > 0) {
        return [
            ...array.slice(0, toIndex),
            item,
            ...array.slice(toIndex, moveIndex),
            ...array.slice(moveIndex + 1, length)
        ];
    } else if (diff < 0) {
        return [
            ...array.slice(0, moveIndex),
            ...array.slice(moveIndex + 1, toIndex + 1),
            item,
            ...array.slice(toIndex + 1, length)
        ];
    }
    return array;
}

const version = '0.0.37v'
editor(savedApp)

function editor(appDefinition){

    const savedDefinition = JSON.parse(localStorage.getItem('app_key_' + version))
    const app = ugnis(savedDefinition || appDefinition)

    let node = document.createElement('div')
    document.body.appendChild(node)

    // State
    let state = {
        leftOpen: false,
        rightOpen: true,
        fullScreen: false,
        editorRightWidth: 450,
        editorLeftWidth: 450,
        subEditorWidth: 450,
        componentEditorPosition: {x: window.innerWidth - 710, y: window.innerHeight / 2} ,
        appIsFrozen: false,
        selectedViewNode: {},
        selectedPipeId: '',
        selectedStateNodeId: '',
        selectedMenu: 'view', // view | state | events
        selectedViewSubMenu: 'props',
        editingTitleNodeId: '',
        viewFoldersClosed: {},
        draggedComponentView: null,
        draggedComponentStateId: null,
        hoveredPipe: null,
        hoveredViewNode: null,
        hoveredEvent: null,
        mousePosition: {},
        eventStack: [],
        definition: savedDefinition || app.definition,
    }
    // undo/redo
    let stateStack = [state.definition]
    let currentAnimationFrameRequest = null;
    function setState(newState, timeTraveling){
        if(newState === state){
            console.warn('state was mutated, search for a bug')
        }
        if(state.definition !== newState.definition){
            // unselect deleted components and state
            if(newState.definition.state[newState.selectedStateNodeId] === undefined){
                newState = {...newState, selectedStateNodeId: ''}
            }
            if(newState.selectedViewNode.ref !== undefined && newState.definition[newState.selectedViewNode.ref][newState.selectedViewNode.id] === undefined){
                newState = {...newState, selectedViewNode: {}}
            }
            // undo/redo then render then save
            if(!timeTraveling){
                const currentIndex = stateStack.findIndex((a)=>a===state.definition)
                stateStack = stateStack.slice(0, currentIndex+1).concat(newState.definition)
            }
            app.render(newState.definition)
            setTimeout(()=>localStorage.setItem('app_key_'+version, JSON.stringify(newState.definition)), 0);
        }
        if(state.appIsFrozen !== newState.appIsFrozen || state.selectedViewNode !== newState.selectedViewNode ){
            app._freeze(newState.appIsFrozen, VIEW_NODE_SELECTED, newState.selectedViewNode)
        }
        if(newState.editingTitleNodeId && state.editingTitleNodeId !== newState.editingTitleNodeId){
            // que auto focus
            setTimeout(()=> {
                const node = document.querySelectorAll('[data-istitleeditor]')[0]
                if(node){
                    node.focus()
                }
            }, 0)
        }
        state = newState
        if(!currentAnimationFrameRequest){
            window.requestAnimationFrame(render)
        }
    }
    document.addEventListener('click', (e)=> {
        // clicked outside
        if(state.editingTitleNodeId && !e.target.dataset.istitleeditor){
            setState({...state, editingTitleNodeId: ''})
        }
    })
    window.addEventListener("resize", function() {
        render()
    }, false)
    window.addEventListener("orientationchange", function() {
        render()
    }, false)
    document.addEventListener('keydown', (e)=>{
        // 83 - s
        // 90 - z
        // 89 - y
        // 32 - space
        // 13 - enter
        // 27 - escape
        if(e.which === 83 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
            // TODO garbage collect
            e.preventDefault();
            fetch('/save', {method: 'POST', body: JSON.stringify(state.definition), headers: {"Content-Type": "application/json"}})
            return false;
        }
        if(e.which === 32 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
            e.preventDefault()
            FREEZER_CLICKED()
        }
        if(!e.shiftKey && e.which === 90 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
            e.preventDefault();
            const currentIndex = stateStack.findIndex((a)=>a===state.definition)
            if(currentIndex > 0){
                const newDefinition = stateStack[currentIndex-1]
                setState({...state, definition: newDefinition}, true)
            }
        }
        if((e.which === 89 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) || (e.shiftKey && e.which === 90 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey))) {
            e.preventDefault();
            const currentIndex = stateStack.findIndex((a)=>a===state.definition)
            if(currentIndex < stateStack.length-1){
                const newDefinition = stateStack[currentIndex+1]
                setState({...state, definition: newDefinition}, true)
            }
        }
        if(e.which === 13) {
            setState({...state, editingTitleNodeId: ''})
        }
        if(e.which === 27) {
            FULL_SCREEN_CLICKED(false)
        }
    })

    // Listen to app
    app.addListener((eventId, data, e, previousState, currentState, mutations)=>{
        setState({...state, eventStack: state.eventStack.concat({eventId, data, e, previousState, currentState, mutations})})
    })

    // Actions
    let openBoxTimeout = null
    function VIEW_DRAGGED(nodeRef, parentRef, initialDepth, e) {
        e.preventDefault()
        const isArrow = e.target.dataset.closearrow
        const isTrashcan = e.target.dataset.trashcan
        const initialX = e.touches? e.touches[0].pageX: e.pageX
        const initialY = e.touches? e.touches[0].pageY: e.pageY
        const position = this.elm.getBoundingClientRect()
        const offsetX = initialX - position.left
        const offsetY = initialY - position.top
        function drag(e){
            e.preventDefault()
            const x = e.touches? e.touches[0].pageX: e.pageX
            const y = e.touches? e.touches[0].pageY: e.pageY
            if(!state.draggedComponentView){
                if(Math.abs(initialY-y) > 3){
                    setState({...state, draggedComponentView: {...nodeRef, depth: initialDepth}, mousePosition: {x: x - offsetX, y: y - offsetY}})
                }
            } else {
                setState({...state, mousePosition: {x: x - offsetX, y: y - offsetY}})
            }
            return false
        }
        window.addEventListener('mousemove', drag)
        window.addEventListener('touchmove', drag)
        function stopDragging(event){
            event.preventDefault()
            window.removeEventListener('mousemove', drag)
            window.removeEventListener('touchmove', drag)
            window.removeEventListener('mouseup', stopDragging)
            window.removeEventListener('touchend', stopDragging)
            if(openBoxTimeout){
                clearTimeout(openBoxTimeout)
                openBoxTimeout = null
            }
            if(!state.draggedComponentView){
                if(event.target === e.target && isArrow){
                    return VIEW_FOLDER_CLICKED(nodeRef.id)
                }
                if(event.target === e.target && isTrashcan){
                    return DELETE_SELECTED_VIEW(nodeRef, parentRef)
                }
                return VIEW_NODE_SELECTED(nodeRef)
            }
            if(!state.hoveredViewNode){
                return setState({...state, draggedComponentView: null,})
            }
            const newParentRef = state.hoveredViewNode.parent
            // frame this somewhere on how not to write code
            const fixedParents = {
                ...state,
                draggedComponentView: null,
                hoveredViewNode: null,
                definition: parentRef.id === newParentRef.id ? { // moving in the same parent
                    ...state.definition,
                    [parentRef.ref]: {
                        ...state.definition[parentRef.ref],
                        [parentRef.id]: {
                            ...state.definition[parentRef.ref][parentRef.id],
                            children: moveInArray(state.definition[parentRef.ref][parentRef.id].children, state.definition[parentRef.ref][parentRef.id].children.findIndex((ref)=> ref.id === nodeRef.id), state.hoveredViewNode.position)
                        }
                    }
                } : parentRef.ref === newParentRef.ref ? { // moving in the similar parent (same type)
                    ...state.definition,
                    [parentRef.ref]: {
                        ...state.definition[parentRef.ref],
                        [parentRef.id]: {
                            ...state.definition[parentRef.ref][parentRef.id],
                            children: state.definition[parentRef.ref][parentRef.id].children.filter((ref)=> ref.id !== nodeRef.id)
                        },
                        [newParentRef.id]: {
                            ...state.definition[newParentRef.ref][newParentRef.id],
                            children: state.definition[newParentRef.ref][newParentRef.id].children.slice(0, state.hoveredViewNode.position).concat(nodeRef, state.definition[newParentRef.ref][newParentRef.id].children.slice(state.hoveredViewNode.position))
                        }
                    },
                } : { // moving to a new type parent
                    ...state.definition,
                    [parentRef.ref]: {
                        ...state.definition[parentRef.ref],
                        [parentRef.id]: {
                            ...state.definition[parentRef.ref][parentRef.id],
                            children: state.definition[parentRef.ref][parentRef.id].children.filter((ref)=> ref.id !== nodeRef.id)
                        },
                    },
                    [newParentRef.ref]: {
                        ...state.definition[newParentRef.ref],
                        [newParentRef.id]: {
                            ...state.definition[newParentRef.ref][newParentRef.id],
                            children: state.definition[newParentRef.ref][newParentRef.id].children.slice(0, state.hoveredViewNode.position).concat(nodeRef, state.definition[newParentRef.ref][newParentRef.id].children.slice(state.hoveredViewNode.position))
                        },
                    },
                }
            }
            setState({
                ...fixedParents,
                definition: {
                    ...fixedParents.definition,
                    [nodeRef.ref]: {
                        ...fixedParents.definition[nodeRef.ref],
                        [nodeRef.id]: {
                            ...fixedParents.definition[nodeRef.ref][nodeRef.id],
                            parent: newParentRef
                        }
                    },
                }
            })
            return false
        }
        window.addEventListener('mouseup', stopDragging)
        window.addEventListener('touchend', stopDragging)
        return false
    }

    function HOVER_MOBILE(e) {
        const elem = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)
        const moveEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            screenX: e.touches[0].screenX,
            screenY: e.touches[0].screenY,
        })
        elem.dispatchEvent(moveEvent)
    }

    function VIEW_HOVERED(nodeRef, parentRef, depth, e) {
        if(!state.draggedComponentView){
            return;
        }
        const hitPosition = (e.touches? 28: e.layerY) / 28
        const insertBefore  = ()=> setState({...state, hoveredViewNode: {parent: parentRef, depth, position: state.definition[parentRef.ref][parentRef.id].children.filter((ref)=> ref.id !== state.draggedComponentView.id).findIndex((ref)=>ref.id === nodeRef.id)}})
        const insertAfter   = ()=> setState({...state, hoveredViewNode: {parent: parentRef, depth, position: state.definition[parentRef.ref][parentRef.id].children.filter((ref)=> ref.id !== state.draggedComponentView.id).findIndex((ref)=>ref.id === nodeRef.id) + 1}})
        const insertAsFirst = ()=> setState({...state, hoveredViewNode: {parent: nodeRef, depth: depth+1, position: 0}})
        const insertAsLast = ()=> setState({...state, hoveredViewNode: {parent: {ref: 'vNodeBox', id: '_rootNode'}, depth: 1, position: state.definition['vNodeBox']['_rootNode'].children.length}})
        const insertAt = (toPutRef, index)=> setState({...state, hoveredViewNode: {parent: toPutRef, depth: depth-1, position: index+1}})

        if(nodeRef.id === state.draggedComponentView.id){
            const parent = state.definition[parentRef.ref][parentRef.id]
            // check if the last child, if yes, go to grandparent and drop there after parent
            if(parent.children[parent.children.length - 1].id === nodeRef.id){
                if(parentRef.id !== '_rootNode') {
                    const grandparent = state.definition[parent.parent.ref][parent.parent.id]
                    const parentPosition = grandparent.children.findIndex((childRef)=> childRef.id === parentRef.id)
                    return insertAt(parent.parent, parentPosition)
                }
            }
            return setState({...state, hoveredViewNode: null,})
        }
        if(nodeRef.id === '_rootNode'){
            return insertAsFirst()
        }
        if(nodeRef.id === '_lastNode'){
            return insertAsLast()
        }
        // pray to god that you did not make a mistake here
        if(state.definition[nodeRef.ref][nodeRef.id].children){ // if box
            if(state.viewFoldersClosed[nodeRef.id] || state.definition[nodeRef.ref][nodeRef.id].children.length === 0){ // if closed or empty box
                if(hitPosition < 0.3){
                    insertBefore()
                } else {
                    if(!openBoxTimeout){
                        openBoxTimeout = setTimeout(()=>VIEW_FOLDER_CLICKED(nodeRef.id, false), 500)
                    }
                    insertAsFirst()
                    return
                }
            } else { // open box
                if(hitPosition < 0.5){
                    insertBefore()
                } else {
                    insertAsFirst()
                }
            }
        } else { // simple node
            if(hitPosition < 0.5){
                insertBefore()
            } else {
                insertAfter()
            }
        }
        if(openBoxTimeout){
            clearTimeout(openBoxTimeout)
            openBoxTimeout = null
        }
    }

    function PIPE_HOVERED(pipeRef, e) {
        if(!state.draggedComponentStateId){
            return;
        }
        setState({...state, hoveredPipe: pipeRef})
    }

    function COMPONENT_VIEW_DRAGGED(e) {
        const initialX = e.touches ? e.touches[0].pageX : e.pageX
        const initialY = e.touches ? e.touches[0].pageY : e.pageY
        const position = this.elm.getBoundingClientRect()
        const offsetX = initialX - position.left
        const offsetY = initialY - position.top

        function drag(e) {
            e.preventDefault()
            const x = e.touches ? e.touches[0].pageX : e.pageX
            const y = e.touches ? e.touches[0].pageY : e.pageY
            setState({
                ...state,
                componentEditorPosition: {x: x - offsetX, y: y - offsetY}
            })
        }
        window.addEventListener('mousemove', drag)
        window.addEventListener('touchmove', drag)
        function stopDragging(event) {
            event.preventDefault()
            window.removeEventListener('mousemove', drag)
            window.removeEventListener('touchmove', drag)
            window.removeEventListener('mouseup', stopDragging)
            window.removeEventListener('touchend', stopDragging)
        }
        window.addEventListener('mouseup', stopDragging)
        window.addEventListener('touchend', stopDragging)
    }
    function WIDTH_DRAGGED(widthName, e) {
        e.preventDefault()
        function resize(e){
            e.preventDefault()
            // TODO refactor
            let newWidth = window.innerWidth - (e.touches? e.touches[0].pageX: e.pageX)
            if(widthName === 'editorLeftWidth'){
                newWidth = e.touches? e.touches[0].pageX: e.pageX
            }
            if(widthName === 'subEditorWidth'){
                newWidth = (e.touches? e.touches[0].pageX: e.pageX) - state.componentEditorPosition.x
            }
            if(widthName === 'subEditorWidthLeft'){
                newWidth = state.componentEditorPosition.x + state.subEditorWidth - (e.touches? e.touches[0].pageX: e.pageX)
                if(newWidth < 250){
                    return
                }
                return setState({...state, subEditorWidth: newWidth, componentEditorPosition: {...state.componentEditorPosition, x: e.touches? e.touches[0].pageX: e.pageX}})
            }
            // I probably was drunk
            if(widthName !== 'subEditorWidth' && widthName !== 'subEditorWidth' && ( (widthName === 'editorLeftWidth' ? state.leftOpen: state.rightOpen) ? newWidth < 180: newWidth > 180)){
                if(widthName === 'editorLeftWidth'){
                    return setState({...state, leftOpen: !state.leftOpen})
                }
                return setState({...state, rightOpen: !state.rightOpen})
            }
            if(newWidth < 250){
                newWidth = 250
            }
            setState({...state, [widthName]: newWidth})
            return false
        }
        window.addEventListener('mousemove', resize)
        window.addEventListener('touchmove', resize)
        function stopDragging(e){
            e.preventDefault()
            window.removeEventListener('mousemove', resize)
            window.removeEventListener('touchmove', resize)
            window.removeEventListener('mouseup', stopDragging)
            window.removeEventListener('touchend', stopDragging)
            return false
        }
        window.addEventListener('mouseup', stopDragging)
        window.addEventListener('touchend', stopDragging)
        return false
    }

    function STATE_DRAGGED(stateId, e) {
        e.preventDefault()
        const initialX = e.touches? e.touches[0].pageX: e.pageX
        const initialY = e.touches? e.touches[0].pageY: e.pageY
        const position = this.elm.getBoundingClientRect()
        const offsetX = initialX - position.left
        const offsetY = initialY - position.top
        function drag(e){
            e.preventDefault()
            const x = e.touches? e.touches[0].pageX: e.pageX
            const y = e.touches? e.touches[0].pageY: e.pageY
            if(!state.draggedComponentView){
                if(Math.abs(initialY-y) > 3){
                    setState({...state, draggedComponentStateId: stateId, mousePosition: {x: x - offsetX, y: y - offsetY}})
                }
            } else {
                setState({...state, mousePosition: {x: x - offsetX, y: y - offsetY}})
            }
            return false
        }
        window.addEventListener('mousemove', drag)
        window.addEventListener('touchmove', drag)
        function stopDragging(event){
            event.preventDefault()
            window.removeEventListener('mousemove', drag)
            window.removeEventListener('touchmove', drag)
            window.removeEventListener('mouseup', stopDragging)
            window.removeEventListener('touchend', stopDragging)
            if(!state.draggedComponentStateId) {
                return STATE_NODE_SELECTED(stateId)
            }
            if(!state.hoveredPipe && !state.hoveredEvent) {
                return setState({
                    ...state,
                    draggedComponentStateId: null,
                    hoveredPipe: null,
                })
            }
            if(state.hoveredEvent){
                // check if event already changes the state
                if(state.definition.state[state.draggedComponentStateId].mutators.map(mutatorRef=>state.definition.mutator[mutatorRef.id].event.id).filter(eventid=>eventid === state.hoveredEvent.id).length){
                    return setState({
                        ...state,
                        draggedComponentStateId: null,
                        hoveredEvent: null,
                    })
                }
                const mutatorId = uuid()
                const pipeId = uuid()
                return setState({
                    ...state,
                    draggedComponentStateId: null,
                    hoveredEvent: null,
                    definition: {
                        ...state.definition,
                        pipe: {
                            ...state.definition.pipe,
                            [pipeId]: {
                                type: state.definition.state[state.draggedComponentStateId].type,
                                value: {ref: 'state', id: state.draggedComponentStateId},
                                transformations: []
                            }
                        },
                        state: {
                            ...state.definition.state,
                            [state.draggedComponentStateId]: {
                                ...state.definition.state[state.draggedComponentStateId],
                                mutators: state.definition.state[state.draggedComponentStateId].mutators.concat({ref: 'mutator', id:mutatorId})
                            }
                        },
                        mutator: {
                            ...state.definition.mutator,
                            [mutatorId]: {
                                event: state.hoveredEvent,
                                state: {ref: 'state', id: state.draggedComponentStateId},
                                mutation: {ref: 'pipe', id: pipeId}
                            }
                        },
                        event: {
                            ...state.definition.event,
                            [state.hoveredEvent.id]: {
                                ...state.definition.event[state.hoveredEvent.id],
                                mutators: state.definition.event[state.hoveredEvent.id].mutators.concat({ref: 'mutator', id:mutatorId})
                            }
                        }
                    }
                })
            }
            const pipeDropped = state.definition.pipe[state.hoveredPipe.id]
            if(pipeDropped.type === 'text'){
                if(state.definition.pipe[state.hoveredPipe.id].value.ref && state.definition.pipe[state.hoveredPipe.id].value.ref === 'state'){
                    return setState({
                        ...state,
                        draggedComponentStateId: null,
                        hoveredPipe: null,
                        definition : {
                            ...state.definition,
                            pipe: {
                                ...state.definition.pipe,
                                [state.hoveredPipe.id]: {
                                    ...state.definition.pipe[state.hoveredPipe.id],
                                    value: {ref: 'state', id:state.draggedComponentStateId},
                                    transformations: []
                                },
                            },
                        }
                    })
                }
                const joinIdState = uuid()
                const joinIdText = uuid()
                const pipeIdState = uuid()
                const pipeIdText = uuid()
                setState({
                    ...state,
                    draggedComponentStateId: null,
                    hoveredPipe: null,
                    definition : {
                        ...state.definition,
                        pipe: {
                            ...state.definition.pipe,
                            [state.hoveredPipe.id]: {
                                ...state.definition.pipe[state.hoveredPipe.id],
                                transformations: [{ref: 'join', id: joinIdState}, {ref: 'join', id: joinIdText}].concat(state.definition.pipe[state.hoveredPipe.id].transformations)
                            },
                            [pipeIdState]: {
                                type: 'text',
                                value: {ref: 'state', id:state.draggedComponentStateId},
                                transformations: []
                            },
                            [pipeIdText]: {
                                type: 'text',
                                value: '',
                                transformations: []
                            },
                        },
                        join: {
                            ...state.definition.join,
                            [joinIdState]: {
                                value: {ref: 'pipe', id: pipeIdState}
                            },
                            [joinIdText]: {
                                value: {ref: 'pipe', id: pipeIdText}
                            },
                        },
                    }
                })
            }
            if(pipeDropped.type === 'number'){
                // you can't drop boolean into number
                if(state.definition.state[state.draggedComponentStateId].type === 'boolean'){
                    return setState({
                        ...state,
                        draggedComponentStateId: null,
                        hoveredPipe: null,
                    })
                }
                if(state.definition.state[state.draggedComponentStateId].type === 'text'){
                    return setState({
                        ...state,
                        draggedComponentStateId: null,
                        hoveredPipe: null,
                        definition : {
                            ...state.definition,
                            pipe: {
                                ...state.definition.pipe,
                                [state.hoveredPipe.id]: {
                                    ...state.definition.pipe[state.hoveredPipe.id],
                                    value: {ref: 'state', id:state.draggedComponentStateId},
                                    transformations: [{
                                        ref: 'length',
                                        id: 'noop'
                                    }]
                                },
                            },
                        }
                    })
                }
                setState({
                    ...state,
                    draggedComponentStateId: null,
                    hoveredPipe: null,
                    definition : {
                        ...state.definition,
                        pipe: {
                            ...state.definition.pipe,
                            [state.hoveredPipe.id]: {
                                ...state.definition.pipe[state.hoveredPipe.id],
                                value: {ref: 'state', id:state.draggedComponentStateId}
                            },
                        },
                    }
                })
            }
            if(pipeDropped.type === 'boolean'){
                if(state.definition.state[state.draggedComponentStateId].type === 'number'){
                    const eqId = uuid()
                    const pipeId = uuid()
                    return setState({
                        ...state,
                        draggedComponentStateId: null,
                        hoveredPipe: null,
                        definition : {
                            ...state.definition,
                            pipe: {
                                ...state.definition.pipe,
                                [state.hoveredPipe.id]: {
                                    ...state.definition.pipe[state.hoveredPipe.id],
                                    value: {ref: 'state', id:state.draggedComponentStateId},
                                    transformations: [{
                                        ref: 'equal',
                                        id: eqId
                                    }]
                                },
                                [pipeId]: {
                                    type: 'number',
                                    value: 0,
                                    transformations: [],
                                }
                            },
                            equal: {
                                ...state.definition.equal,
                                [eqId]: {
                                    value: {
                                        ref: 'pipe',
                                        id: pipeId
                                    }
                                },
                            },
                        }
                    })
                }
                if(state.definition.state[state.draggedComponentStateId].type === 'text'){
                    const eqId = uuid()
                    const pipeId = uuid()
                    return setState({
                        ...state,
                        draggedComponentStateId: null,
                        hoveredPipe: null,
                        definition : {
                            ...state.definition,
                            pipe: {
                                ...state.definition.pipe,
                                [state.hoveredPipe.id]: {
                                    ...state.definition.pipe[state.hoveredPipe.id],
                                    value: {ref: 'state', id:state.draggedComponentStateId},
                                    transformations: [{
                                        ref: 'equal',
                                        id: eqId
                                    }]
                                },
                                [pipeId]: {
                                    type: 'text',
                                    value: 'Default text',
                                    transformations: [],
                                }
                            },
                            equal: {
                                ...state.definition.equal,
                                [eqId]: {
                                    value: {
                                        ref: 'pipe',
                                        id: pipeId
                                    }
                                },
                            },
                        }
                    })
                }
                setState({
                    ...state,
                    draggedComponentStateId: null,
                    hoveredPipe: null,
                    definition : {
                        ...state.definition,
                        pipe: {
                            ...state.definition.pipe,
                            [state.hoveredPipe.id]: {
                                ...state.definition.pipe[state.hoveredPipe.id],
                                value: {ref: 'state', id:state.draggedComponentStateId},
                                transformations: [] // TODO leave for state
                            },
                        },
                    }
                })
            }
        }
        window.addEventListener('mouseup', stopDragging)
        window.addEventListener('touchend', stopDragging)
    }
    function OPEN_SIDEBAR(side) {
        if(side === 'left'){
            return setState({...state, leftOpen: !state.leftOpen})
        }
        if(side === 'right'){
            return setState({...state, rightOpen: !state.rightOpen})
        }
    }
    function FREEZER_CLICKED() {
        setState({...state, appIsFrozen: !state.appIsFrozen})
    }
    function VIEW_FOLDER_CLICKED(nodeId, forcedValue) {
        setState({...state, viewFoldersClosed:{...state.viewFoldersClosed, [nodeId]: forcedValue !== undefined ? forcedValue : !state.viewFoldersClosed[nodeId]}})
    }
    function VIEW_NODE_SELECTED(ref) {
        setState({...state, selectedViewNode:ref})
    }
    function UNSELECT_VIEW_NODE(selfOnly, stopPropagation, e) {
        if(stopPropagation){
            e.stopPropagation()
        }
        if(selfOnly && e.target !== this.elm){
            return
        }
        setState({...state, selectedViewNode:{}})
    }
    function STATE_NODE_SELECTED(nodeId) {
        setState({...state, selectedStateNodeId:nodeId})
    }
    function UNSELECT_STATE_NODE(e) {
        if(e.target === this.elm){
            setState({...state, selectedStateNodeId:''})
        }
    }
    function ADD_NODE(nodeRef, type) {
        if(!nodeRef.ref || !state.definition[nodeRef.ref][nodeRef.id] || !state.definition[nodeRef.ref][nodeRef.id].children){
            if(state.selectedViewNode.id && state.selectedViewNode.id !== '_rootNode'){
                nodeRef = state.definition[state.selectedViewNode.ref][state.selectedViewNode.id].parent
            } else {
                nodeRef = {ref: 'vNodeBox', id: '_rootNode'}
            }
        }
        const nodeId = nodeRef.id
        const newNodeId = uuid()
        const newStyleId = uuid()
        const newStyle = {
        }
        if(type === 'box') {
            const newNode = {
                title: 'box',
                parent: nodeRef,
                style: {ref:'style', id:newStyleId},
                children: [],
            }
            return setState({
                ...state,
                selectedViewNode: {ref:'vNodeBox', id: newNodeId},
                definition: nodeRef.ref === 'vNodeBox' ? {
                    ...state.definition,
                    vNodeBox: {...state.definition.vNodeBox, [nodeId]: {...state.definition.vNodeBox[nodeId], children: state.definition.vNodeBox[nodeId].children.concat({ref:'vNodeBox', id:newNodeId})}, [newNodeId]: newNode},
                    style: {...state.definition.style, [newStyleId]: newStyle},
                } : {
                    ...state.definition,
                    [nodeRef.ref]: {...state.definition[nodeRef.ref], [nodeId]: {...state.definition[nodeRef.ref][nodeId], children: state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeBox', id:newNodeId})}},
                    vNodeBox: {...state.definition.vNodeBox, [newNodeId]: newNode},
                    style: {...state.definition.style, [newStyleId]: newStyle},
                }
            })
        }
        if(type === 'text'){
            const pipeId = uuid()
            const newNode = {
                title: 'text',
                parent: nodeRef,
                style: {ref:'style', id:newStyleId},
                value: {ref:'pipe', id:pipeId}
            }
            const newPipe = {
                type: 'text',
                value: 'Default Text',
                transformations: []
            }
            return setState({
                ...state,
                selectedViewNode: {ref:'vNodeText', id: newNodeId},
                definition: {
                    ...state.definition,
                    pipe: {...state.definition.pipe, [pipeId]: newPipe},
                    [nodeRef.ref]: {...state.definition[nodeRef.ref], [nodeId]: {...state.definition[nodeRef.ref][nodeId], children: state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeText', id:newNodeId})}},
                    vNodeText: {...state.definition.vNodeText, [newNodeId]: newNode},
                    style: {...state.definition.style, [newStyleId]: newStyle},
                }})
        }
        if(type === 'image'){
            const pipeId = uuid()
            const newNode = {
                title: 'image',
                parent: nodeRef,
                style: {ref:'style', id:newStyleId},
                src: {ref:'pipe', id:pipeId}
            }
            const newPipe = {
                type: 'text',
                value: 'https://www.ugnis.com/images/logo256x256.png',
                transformations: []
            }
            return setState({
                ...state,
                selectedViewNode: {ref:'vNodeImage', id: newNodeId},
                definition: {
                    ...state.definition,
                    pipe: {...state.definition.pipe, [pipeId]: newPipe},
                    [nodeRef.ref]: {...state.definition[nodeRef.ref], [nodeId]: {...state.definition[nodeRef.ref][nodeId], children: state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeImage', id:newNodeId})}},
                    vNodeImage: {...state.definition.vNodeImage, [newNodeId]: newNode},
                    style: {...state.definition.style, [newStyleId]: newStyle},
                }})
        }
        if(type === 'if'){
            const pipeId = uuid()
            const newNode = {
                title: 'conditional',
                parent: nodeRef,
                value: {ref:'pipe', id:pipeId},
                children: [],
            }
            const newPipe = {
                type: 'boolean',
                value: true,
                transformations: []
            }
            return setState({
                ...state,
                selectedViewNode: {ref:'vNodeIf', id: newNodeId},
                definition: nodeRef.ref === 'vNodeIf' ? {
                    ...state.definition,
                    pipe: {...state.definition.pipe, [pipeId]: newPipe},
                    vNodeIf: {...state.definition.vNodeIf, [nodeId]: {...state.definition.vNodeIf[nodeId], children: state.definition.vNodeIf[nodeId].children.concat({ref:'vNodeIf', id:newNodeId})}, [newNodeId]: newNode},
                } : {
                    ...state.definition,
                    pipe: {...state.definition.pipe, [pipeId]: newPipe},
                    [nodeRef.ref]: {...state.definition[nodeRef.ref], [nodeId]: {...state.definition[nodeRef.ref][nodeId], children: state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeIf', id:newNodeId})}},
                    vNodeIf: {...state.definition.vNodeIf, [newNodeId]: newNode},
                }
            })
        }
        if(type === 'input') {
            const stateId = uuid()
            const eventId = uuid()
            const mutatorId = uuid()
            const pipeInputId = uuid()
            const pipeMutatorId = uuid()
            const newNode = {
                title: 'input',
                parent: nodeRef,
                style: {ref:'style', id:newStyleId},
                value: {ref:'pipe', id:pipeInputId},
                input: {ref:'event', id:eventId}
            }
            const newPipeInput = {
                type: 'text',
                value: {ref: 'state', id: stateId},
                transformations: []
            }
            const newPipeMutator = {
                type: 'text',
                value: {ref: 'eventData', id: '_input'},
                transformations: []
            }
            const newState = {
                title: 'input value',
                type: 'text',
                ref: stateId,
                defaultValue: 'Default text',
                mutators: [{ ref:'mutator', id:mutatorId}],
            }
            const newMutator = {
                event: { ref: 'event', id:eventId},
                state: { ref: 'state', id:stateId},
                mutation: { ref: 'pipe', id: pipeMutatorId},
            }
            const newEvent = {
                type: 'input',
                title: 'update input',
                mutators: [
                    { ref: 'mutator', id: mutatorId},
                ],
                emitter: {
                    ref: 'vNodeInput',
                    id: newNodeId,
                },
                data: [
                    {ref: 'eventData', id: '_input'}
                ],
            }
            return setState({
                ...state,
                selectedViewNode: {ref:'vNodeInput', id: newNodeId},
                definition: {
                    ...state.definition,
                    pipe: {...state.definition.pipe, [pipeInputId]: newPipeInput, [pipeMutatorId]: newPipeMutator},
                    [nodeRef.ref]: {...state.definition[nodeRef.ref], [nodeId]: {...state.definition[nodeRef.ref][nodeId], children: state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeInput', id:newNodeId})}},
                    vNodeInput: {...state.definition.vNodeInput, [newNodeId]: newNode},
                    style: {...state.definition.style, [newStyleId]: newStyle},
                    nameSpace: {...state.definition.nameSpace, ['_rootNameSpace']: {...state.definition.nameSpace['_rootNameSpace'], children: state.definition.nameSpace['_rootNameSpace'].children.concat({ref:'state', id:stateId})}},
                    state: {...state.definition.state, [stateId]: newState},
                    mutator: {...state.definition.mutator, [mutatorId]: newMutator},
                    event: {...state.definition.event, [eventId]: newEvent},
                }})
        }
    }
    function ADD_STATE(namespaceId, type) {
        const newStateId = uuid()
        let newState
        if(type === 'text') {
            newState = {
                title: 'new text',
                ref: newStateId,
                type: 'text',
                defaultValue: 'Default text',
                mutators: [],
            }
        }
        if(type === 'number') {
            newState = {
                title: 'new number',
                ref: newStateId,
                type: 'number',
                defaultValue: 0,
                mutators: [],
            }
        }
        if(type === 'boolean') {
            newState = {
                title: 'new boolean',
                type: 'boolean',
                ref: newStateId,
                defaultValue: true,
                mutators: [],
            }
        }
        if(type === 'table') {
            newState = {
                title: 'new table',
                type: 'table',
                ref: newStateId,
                defaultValue: {},
                mutators: [],
            }
        }
        if(type === 'folder') {
            newState = {
                title: 'new folder',
                children: [],
            }
            return setState({...state, definition: {
                ...state.definition,
                nameSpace: {...state.definition.nameSpace, [namespaceId]: {...state.definition.nameSpace[namespaceId], children: state.definition.nameSpace[namespaceId].children.concat({ref:'nameSpace', id:newStateId})}, [newStateId]: newState},
            }})
        }
        setState({...state, definition: {
            ...state.definition,
            nameSpace: {...state.definition.nameSpace, [namespaceId]: {...state.definition.nameSpace[namespaceId], children: state.definition.nameSpace[namespaceId].children.concat({ref:'state', id:newStateId})}},
            state: {...state.definition.state, [newStateId]: newState},
        }})
    }
    function ADD_DEFAULT_STYLE(styleId, key) {
        const pipeId = uuid()
        const defaults = {
            'background': 'white',
            'border': '1px solid black',
            'outline': '1px solid black',
            'cursor': 'pointer',
            'color': 'black',
            'display': 'block',
            'top': '0px',
            'bottom': '0px',
            'transition': '0.5s all',
            'left': '0px',
            'right': '0px',
            'flex': '1 1 auto',
            'justifyContent': 'center',
            'alignItems': 'center',
            'maxWidth': '100%',
            'maxHeight': '100%',
            'minWidth': '100%',
            'minHeight': '100%',
            'position': 'absolute',
            'overflow': 'auto',
            'height': '500px',
            'width': '500px',
            'font': 'italic 2em "Comic Sans MS", cursive, sans-serif',
            'margin': '10px',
            'padding': '10px',
        }
        setState({...state, definition: {
            ...state.definition,
            pipe: {...state.definition.pipe, [pipeId]: {type: 'text', value: defaults[key], transformations:[]}},
            style: {...state.definition.style, [styleId]: {...state.definition.style[styleId], [key]: {ref: 'pipe', id: pipeId}}}}})
    }
    function SELECT_VIEW_SUBMENU(newId) {
        setState({...state, selectedViewSubMenu:newId})
    }
    function EDIT_VIEW_NODE_TITLE(nodeId) {
        setState({...state, editingTitleNodeId:nodeId})
    }
    function DELETE_SELECTED_VIEW(nodeRef, parentRef) {
        // remove all events from state
        const events = getAvailableEvents(nodeRef.ref)
        let newState = state.definition.state
        events.forEach((event)=>{
            const eventRef = state.definition[nodeRef.ref][nodeRef.id][event.propertyName]
            if(eventRef){
                // event -> mutators -> states
                state.definition[eventRef.ref][eventRef.id].mutators.forEach((mutatorRef)=> {
                    const stateRef = state.definition[mutatorRef.ref][mutatorRef.id].state
                    newState = {
                        ... newState,
                        [stateRef.id]: {
                            ...newState[stateRef.id],
                            mutators: newState[stateRef.id].mutators.filter((mutator)=> mutator.id !== mutatorRef.id)
                        }
                    }
                })
            }
        })
        setState({...state, definition: {
            ...state.definition,
            [parentRef.ref]: {...state.definition[parentRef.ref], [parentRef.id]: {...state.definition[parentRef.ref][parentRef.id], children:state.definition[parentRef.ref][parentRef.id].children.filter((ref)=>ref.id !== nodeRef.id)}},
            state: newState,
        }, selectedViewNode: {}})
    }
    function CHANGE_VIEW_NODE_TITLE(nodeRef, e) {
        e.preventDefault();
        const nodeId = nodeRef.id
        const nodeType = nodeRef.ref
        setState({...state, definition: {
            ...state.definition,
            [nodeType]: {...state.definition[nodeType], [nodeId]: {...state.definition[nodeType][nodeId], title: e.target.value}},
        }})
    }
    function CHANGE_STATE_NODE_TITLE(nodeId, e) {
        e.preventDefault();
        setState({...state, definition: {
            ...state.definition,
            state: {...state.definition.state, [nodeId]: {...state.definition.state[nodeId], title: e.target.value}},
        }})
    }
    function CHANGE_NAMESPACE_TITLE(nodeId, e) {
        e.preventDefault();
        setState({...state, definition: {
            ...state.definition,
            nameSpace: {...state.definition.nameSpace, [nodeId]: {...state.definition.nameSpace[nodeId], title: e.target.value}},
        }})
    }
    function CHANGE_CURRENT_STATE_TEXT_VALUE(stateId, e) {
        app.setCurrentState({...app.getCurrentState(), [stateId]: e.target.value})
        render()
    }
    function CHANGE_CURRENT_STATE_BOOLEAN_VALUE(stateId, e) {
        app.setCurrentState({...app.getCurrentState(), [stateId]: e.target.value === 'true'})
        render()
    }
    function CHANGE_CURRENT_STATE_NUMBER_VALUE(stateId, e) {
        // todo big throws error instead of returning NaN... fix, rewrite or hack
        try {
            if(big(e.target.value).toString() !== app.getCurrentState()[stateId].toString()){
                app.setCurrentState({...app.getCurrentState(), [stateId]: big(e.target.value)})
                render()
            }
        } catch(err) {
        }
    }
    function CHANGE_STATIC_VALUE(ref, propertyName, type, e) {
        let value = e.target.value
        if(type === 'number'){
            try {
                value = big(e.target.value)
            } catch(err) {
                return;
            }
        }
        if(type === 'boolean'){
            value = (value === true || value === 'true') ? true : false
        }
        setState({...state, definition:{
            ...state.definition,
            [ref.ref]: {
                ...state.definition[ref.ref],
                [ref.id]: {
                    ...state.definition[ref.ref][ref.id],
                    [propertyName]: value
                }
            }
        }})
    }
    function ADD_EVENT(propertyName, node) {
        const ref = state.selectedViewNode
        const eventId = uuid();
        setState({...state, definition:{
            ...state.definition,
            [ref.ref]: {
                ...state.definition[ref.ref],
                [ref.id]: {
                    ...state.definition[ref.ref][ref.id],
                    [propertyName]: {ref: 'event', id: eventId}
                }
            },
            event: {
                ...state.definition.event,
                [eventId]: {
                    type: propertyName,
                    emitter: node,
                    mutators: [],
                    data: []
                }
            }
        }})
    }
    function SELECT_PIPE(pipeId, e) {
        e.stopPropagation()
        setState({...state, selectedPipeId:pipeId})
    }
    function ADD_DEFAULT_TRANSFORMATION(pipeId) {
        const defaultTransformations = {
            text: 'toUpperCase',
            number: 'add',
            boolean: 'and'
        }
        const defaultValues = {
            text: 'Default text',
            number: 0,
            boolean: true
        }
        const pipe = state.definition.pipe[pipeId]
        const stateInPipe = state.definition.state[pipe.value.id]
        const transformation = defaultTransformations[stateInPipe.type]
        const value = defaultValues[stateInPipe.type]
        const newPipeId = uuid();
        const newId = uuid();

        const oldTransformations = state.definition.pipe[pipeId].transformations
        const newPipeTransformations = pipe.type === 'text' || pipe.type === stateInPipe.type ? oldTransformations.concat({ref: transformation, id:newId}): oldTransformations.slice(0, oldTransformations.length - 1).concat({ref: transformation, id:newId}).concat(oldTransformations.slice(oldTransformations.length - 1))
        setState({...state, definition: {
            ...state.definition,
            [transformation]: {
                ...state.definition[transformation],
                [newId]: {
                    value: {ref: 'pipe', id:newPipeId}
                }
            },
            pipe: {
                ...state.definition.pipe,
                [newPipeId]: {
                    type: pipe.type,
                    value: value,
                    transformations: []
                },
                [pipeId]: {
                    ...state.definition.pipe[pipeId],
                    transformations: newPipeTransformations
                }
            }
        }})
    }
    function RESET_APP_STATE() {
        app.setCurrentState(app.createDefaultState())
        setState({...state, eventStack: []})
    }
    function RESET_APP_DEFINITION() {
        if(state.definition !== appDefinition){
            setState({...state, definition: {...appDefinition}})
        }
    }
    function FULL_SCREEN_CLICKED(value) {
        if(value !== state.fullScreen){
            setState({...state, fullScreen: value})
        }
    }
    function SAVE_DEFAULT(stateId) {
        setState({...state, definition:{
            ...state.definition,
            state: {
                ...state.definition.state,
                [stateId]: {
                    ...state.definition.state[stateId],
                    defaultValue: app.getCurrentState()[stateId]
                }
            }
        }})
    }
    function DELETE_STATE(stateId) {
        let removedPipeState = state
        Object.keys(state.definition.pipe).forEach((pipeid)=> {
            if(state.definition.pipe[pipeid].value.id === stateId){
                removedPipeState = resetPipeFunc(pipeid, removedPipeState)
            }
        })
        const {[stateId]: deletedState, ...newState} = removedPipeState.definition.state
        let events = removedPipeState.definition.event
        deletedState.mutators.forEach((mutatorRef)=>{
            const mutator = removedPipeState.definition[mutatorRef.ref][mutatorRef.id]
            const event = mutator.event
            events = {
                ...events,
                [event.id]: {
                    ...events[event.id],
                    mutators: events[event.id].mutators.filter((mutRef)=> mutRef.id !== mutatorRef.id)
                }
            }
        })
        setState({...removedPipeState,
            selectedStateNodeId: '',
            definition:{
                ...removedPipeState.definition,
                state: newState,
                nameSpace: {
                    ...removedPipeState.definition.nameSpace,
                    '_rootNameSpace': {
                        ...removedPipeState.definition.nameSpace['_rootNameSpace'],
                        children: removedPipeState.definition.nameSpace['_rootNameSpace'].children.filter((ref)=> ref.id !== stateId)
                    }
                },
                event: events
            }})
    }
    function EVENT_HOVERED(eventRef) {
        setState({
            ...state,
            hoveredEvent: eventRef
        })
    }
    function EVENT_UNHOVERED() {
        if(state.hoveredEvent){
            setState({
                ...state,
                hoveredEvent: null
            })
        }
    }
    function PIPE_UNHOVERED() {
        if(state.hoveredPipe){
            setState({
                ...state,
                hoveredPipe: null
            })
        }
    }
    function resetPipeFunc(pipeId, state){
        const defaultValues = {
            text: 'Default text',
            number: 0,
            boolean: true
        }
        let parentJoinId;
        Object.keys(state.definition.join).forEach((joinId) => {
            if(state.definition.join[joinId].value.id === pipeId){
                parentJoinId = joinId
            }
        })
        if(parentJoinId){
            const pipes = Object.keys(state.definition.pipe)
            for(let i = 0; i<pipes.length; i++ ) {
                const parentPipeId = pipes[i]
                for (let index = 0; index < state.definition.pipe[parentPipeId].transformations.length; index++) {
                    const ref = state.definition.pipe[parentPipeId].transformations[index]
                    if (ref.id === parentJoinId) {
                        const joinRef = state.definition.pipe[parentPipeId].transformations[index + 1]
                        const secondPipeRef = state.definition.join[joinRef.id].value
                        const text = state.definition.pipe[secondPipeRef.id].value
                        return {
                            ...state,
                            selectedPipeId: '',
                            definition: {
                                ...state.definition,
                                pipe: {
                                    ...state.definition.pipe,
                                    [parentPipeId]: {
                                        ...state.definition.pipe[parentPipeId],
                                        value: state.definition.pipe[parentPipeId].value + text,
                                        transformations: state.definition.pipe[parentPipeId].transformations.slice(0, index).concat(state.definition.pipe[secondPipeRef.id].transformations).concat(state.definition.pipe[parentPipeId].transformations.slice(index + 2))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            return {
                ...state,
                selectedPipeId: '',
                definition: {
                    ...state.definition,
                    pipe: {
                        ...state.definition.pipe,
                        [pipeId]: {
                            ...state.definition.pipe[pipeId],
                            value: defaultValues[state.definition.pipe[pipeId].type],
                            transformations: []
                        }
                    }
                }
            }
        }
    }
    function RESET_PIPE(pipeId,e) {
        e.stopPropagation()

        setState(resetPipeFunc(pipeId, state))
    }
    function CHANGE_TRANSFORMATION(pipeRef, transformationRef, index, e) {
        if(transformationRef.ref === e.target.value){
            return
        }
        const {[transformationRef.id]: actualTransform, ...left} = state.definition[transformationRef.ref]
        setState({
            ...state,
            definition: {
                ...state.definition,
                pipe: {
                    ...state.definition.pipe,
                    [pipeRef.id]: {
                        ...state.definition.pipe[pipeRef.id],
                        transformations: state.definition.pipe[pipeRef.id].transformations.map((transf)=> transf.id === transformationRef.id ? {ref: e.target.value, id: transformationRef.id}: transf)
                    }
                },
                [transformationRef.ref]: left,
                [e.target.value]: {
                    ...state.definition[e.target.value],
                    [transformationRef.id]: actualTransform
                }
            }
        })
    }
    function CHANGE_MENU(type) {
        setState({...state, selectedMenu: type})
    }

    const boxIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'layers')
    const ifIcon = () => h('i', {attrs: {class: 'material-icons'}, style: {transform: 'rotate(90deg)'}}, 'call_split')
    const moreIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'more_horiz')
    const numberIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'looks_one')
    const listIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'view_list')
    const inputIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'input')
    const textIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'text_fields')
    const textReverseIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'format_size')
    const deleteIcon = () => h('i', {attrs: {class: 'material-icons', 'data-trashcan': true}}, 'delete_forever')
    const clearIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'clear')
    const closeIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'close')
    const addCircleIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'add_circle')
    const folderIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'folder')
    const saveIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'check')
    const storageIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'storage')
    const eventListIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'event_note')
    const imageIcon = () => h('i', {attrs: {class: 'material-icons'}}, 'crop_original')
    const warningIcon = () => h('i', {attrs: {class: 'material-icons'}, style: {cursor: 'default'}}, 'whatshot') // priority_high
    const appIcon = () => h('i', {attrs: {class: 'material-icons'}, style: { fontSize: '18px'}}, 'description')
    const arrowIcon = (rotate) => h('i', {attrs: {class: 'material-icons', 'data-closearrow': true}, style: {transition: 'all 0.2s', transform: rotate ? 'rotate(-90deg)' : 'rotate(0deg)', cursor: 'pointer'}}, 'expand_more')

    function getAvailableEvents(type) {
        let availableEvents = [
            {
                description: 'on click',
                propertyName: 'click'
            },
            {
                description: 'double clicked',
                propertyName: 'dblclick'
            },
            {
                description: 'mouse over',
                propertyName: 'mouseover'
            },
            {
                description: 'mouse out',
                propertyName: 'mouseout'
            },
        ]
        if (type === 'vNodeInput') {
            availableEvents = availableEvents.concat([
                {
                    description: 'input',
                    propertyName: 'input'
                },
                {
                    description: 'focus',
                    propertyName: 'focus'
                },
                {
                    description: 'blur',
                    propertyName: 'blur'
                },
            ])
        }
        return availableEvents
    }
    const fields = {
        vNodeBox: ['style', 'children', 'mouseout', 'mouseover', 'dblclick', 'click'],
        vNodeText: ['style', 'value', 'mouseout', 'mouseover', 'dblclick', 'click'],
        vNodeInput: ['style', 'value', 'mouseout', 'mouseover', 'dblclick', 'click', 'input', 'focus', 'blur'],
        vNodeIf: ['value', 'children'],
        vNodeImage: ['style', 'src', 'mouseout', 'mouseover', 'dblclick', 'click'],
        add: ['value'],
        subtract: ['value'],
        multiply: ['value'],
        divide: ['value'],
        remainder: ['value'],
        join: ['value'],
        and: ['value'],
        or: ['value'],
        equal: ['value'],
        event: ['mutators'],
        mutator: ['mutation'],
        style: ['background', 'border', 'outline', 'cursor', 'color', 'transition', 'display', 'top', 'bottom', 'left', 'flex', 'justifyContent', 'alignItems', 'width', 'height', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight', 'right', 'position', 'overflow', 'font', 'margin', 'padding'],
        state: [],
        length: [],
        toLowerCase: [],
        toUpperCase: [],
        pipe: ['value', 'transformations'],
    }
    const memoizedRefs = {}
    function lookForSelectedState(nodeRef){
        // check if node was memoized, has not changed (immutable reference) and has an answer for seleted state
        if(memoizedRefs[nodeRef.id] && memoizedRefs[nodeRef.id].stateDefinition === state.definition && memoizedRefs[nodeRef.id].isClosed === state.viewFoldersClosed[nodeRef.id] && memoizedRefs[nodeRef.id][state.selectedStateNodeId] !== undefined){
            return memoizedRefs[nodeRef.id][state.selectedStateNodeId]
        }
        // check data, style, event mutations
        const value = (()=> {
            const node = state.definition[nodeRef.ref][nodeRef.id]
            const fieldsToCheck = fields[nodeRef.ref]
            for (let i = 0; i < fieldsToCheck.length; i++) {
                const fieldName = fieldsToCheck[i]
                if (node[fieldName] === undefined) continue;
                if (node[fieldName].id === state.selectedStateNodeId) return true
                // transformations, children, mutators
                if ((fieldName === 'children' && state.viewFoldersClosed[nodeRef.id]) || fieldName === 'mutators' || fieldName === 'transformations') {
                    for (let j = 0; j < node[fieldName].length; j++) {
                        if (lookForSelectedState(node[fieldName][j]) === true) {
                            return true
                        }
                    }
                }
                if (node[fieldName].ref) {
                    if (lookForSelectedState(node[fieldName]) === true) {
                        return true
                    }
                }
            }
            return false
        })()
        memoizedRefs[nodeRef.id] = {
            ...memoizedRefs[nodeRef.id],
            stateDefinition: state.definition,
            isClosed: state.viewFoldersClosed[nodeRef.id],
            [state.selectedStateNodeId]: value,
        }
        return value
    }

    function render() {
        const currentRunningState = app.getCurrentState()
        const dragComponentLeft = h('div', {
            on: {
                mousedown: [WIDTH_DRAGGED, 'editorLeftWidth'],
                touchstart: [WIDTH_DRAGGED, 'editorLeftWidth'],
            },
            style: {
                position: 'absolute',
                right: '0',
                transform: 'translateX(100%)',
                top: '0',
                width: '10px',
                height: '100%',
                textAlign: 'center',
                opacity: '0',
                cursor: 'col-resize',
            },
        })
        const openComponentLeft = h('div', {
            on: {
                mousedown: [OPEN_SIDEBAR, 'left'],
                touchstart: [OPEN_SIDEBAR, 'left'],
            },
            style: {
                position: 'absolute',
                right: '-3px',
                top: '50%',
                transform: 'translateZ(0) translateX(100%) translateY(-50%)',
                width: '15px',
                height: '10%',
                textAlign: 'center',
                borderRadius: '0 5px 5px 0',
                background: '#5d5d5d',
                boxShadow: 'inset 0 0 2px 7px #222',
                cursor: 'pointer',
            },
        })
        const openComponentRight = h('div', {
            on: {
                mousedown: [OPEN_SIDEBAR, 'right'],
                touchstart: [OPEN_SIDEBAR, 'right'],
            },
            style: {
                position: 'absolute',
                left: '-3px',
                top: '50%',
                transform: 'translateZ(0) translateX(-100%) translateY(-50%)',
                width: '15px',
                height: '10%',
                textAlign: 'center',
                borderRadius: '5px 0 0 5px',
                background: '#5d5d5d',
                boxShadow: 'inset 0 0 2px 7px #222',
                cursor: 'pointer',
            },
        })
        const dragComponentRight = h('div', {
            on: {
                mousedown: [WIDTH_DRAGGED, 'editorRightWidth'],
                touchstart: [WIDTH_DRAGGED, 'editorRightWidth'],
            },
            style: {
                position: 'absolute',
                left: '0',
                transform: 'translateX(-100%)',
                top: '0',
                width: '10px',
                height: '100%',
                textAlign: 'center',
                opacity: '0',
                cursor: 'col-resize',
            },
        })
        const dragSubComponentRight = h('div', {
            on: {
                mousedown: [WIDTH_DRAGGED, 'subEditorWidth'],
                touchstart: [WIDTH_DRAGGED, 'subEditorWidth'],
            },
            style: {
                position: 'absolute',
                right: '2px',
                transform: 'translateX(100%)',
                top: '0',
                width: '10px',
                height: '100%',
                textAlign: 'center',
                opacity: 0,
                cursor: 'col-resize',
            },
        })
        const dragSubComponentLeft = h('div', {
            on: {
                mousedown: [WIDTH_DRAGGED, 'subEditorWidthLeft'],
                touchstart: [WIDTH_DRAGGED, 'subEditorWidthLeft'],
            },
            style: {
                position: 'absolute',
                left: '2px',
                transform: 'translateX(-100%)',
                top: '0',
                width: '10px',
                height: '100%',
                textAlign: 'center',
                opacity: 0,
                cursor: 'col-resize',
            },
        })

        function emberEditor(ref){
            const pipe = state.definition[ref.ref][ref.id]

            function listTransformations(transformations) {
                return transformations.map((transRef, index)=>{
                    const transformer = state.definition[transRef.ref][transRef.id]
                    if (transRef.ref === 'equal') {
                        return h('div', {style: {paddingTop: '5px'}}, [
                            h('span', {style: {color: '#bdbdbd', cursor: 'default', display:'inline-block'}}, [h('span', {style: {flex: '1'}}, transRef.ref)]),
                            h('span', {style: {display: 'inline-block'}},  [emberEditor(transformer.value)])
                        ])
                    }
                    if (transRef.ref === 'join') {
                        return h('span', {}, [emberEditor(transformer.value)])
                    }
                    if (transRef.ref === 'length') {
                        return h('div', {style: {paddingTop: '5px'}}, [
                            h('div', {style: {cursor: 'default'}}, [h('span', {style: {color: '#bdbdbd'}}, transRef.ref)]),
                        ])
                    }

                    const numberTransf = [{title: 'add', sign: '+'}, {title: 'subtract', sign: '-'}, {title: 'multiply', sign: '*'}, {title: 'divide', sign: '/'}, {title: 'remainder', sign: '%'}]
                    const textTransf = [{title: 'toUpperCase', sign: 'to upper case'}, {title: 'toLowerCase', sign: 'to lower case'}]
                    const boolTransf = [{title: 'and', sign: 'and'}, {title: 'or', sign: 'or'}, {title: 'not', sign: 'not'}]

                    if (transRef.ref === 'add' || transRef.ref === 'subtract' || transRef.ref === 'multiply' || transRef.ref === 'divide' || transRef.ref === 'remainder') {
                        return h('div', {style: {paddingTop: '5px', display: 'flex', alignItems: 'stretch'}}, [
                            h('select', {key: transRef.id, liveProps: {value: transRef.ref}, style: {color: 'white', background: 'none', outline: 'none', display: 'inline', border: 'none',}, on: {input: [CHANGE_TRANSFORMATION, ref, transRef, index]}},
                                numberTransf.map((description) =>
                                    h('option', {attrs: {value: description.title}, style: {color: 'black'}}, description.sign),
                                )
                            ),
                            h('span', {style: {color: '#bdbdbd', display: 'flex',  cursor: 'default', paddingRight: '5px', borderRight: '2px solid #bdbdbd', marginRight: '5px'}}, [h('span', {style: {flex: '1'}},)]),
                            h('span', {style: {display: 'inline-block'}},  [emberEditor(transformer.value)])
                        ])
                    }
                    if (transRef.ref === 'toUpperCase' || transRef.ref === 'toLowerCase') {
                        return h('div', {style: {paddingTop: '5px', display: 'flex', alignItems: 'stretch'}}, [
                            h('select', {key: transRef.id, liveProps: {value: transRef.ref}, style: {color: 'white', background: 'none', outline: 'none', display: 'inline', border: 'none',}, on: {input: [CHANGE_TRANSFORMATION, ref, transRef, index]}},
                                textTransf.map((description) =>
                                    h('option', {attrs: {value: description.title}, style: {color: 'black'}}, description.sign),
                                )
                            ),
                            h('span', {style: {color: '#bdbdbd', display: 'flex',  cursor: 'default', paddingRight: '5px', marginRight: '5px'}}, [h('span', {style: {flex: '1'}},)]),
                        ])
                    }
                    if (transRef.ref === 'and' || transRef.ref === 'or' || transRef.ref === 'not') {
                        return h('div', {style: {paddingTop: '5px', display: 'flex', alignItems: 'stretch'}}, [
                            h('select', {key: transRef.id, liveProps: {value: transRef.ref}, style: {color: 'white', background: 'none', outline: 'none', display: 'inline', border: 'none',}, on: {input: [CHANGE_TRANSFORMATION, ref, transRef, index]}},
                                boolTransf.map((description) =>
                                    h('option', {attrs: {value: description.title}, style: {color: 'black'}}, description.sign),
                                )
                            ),
                            h('span', {style: {color: '#bdbdbd', display: 'flex',  cursor: 'default', paddingRight: '5px', borderRight: '2px solid #bdbdbd', marginRight: '5px'}}, [h('span', {style: {flex: '1'}},)]),
                            transRef.ref === 'not'? h('span') : h('span', {style: {display: 'inline-block'}},  [emberEditor(transformer.value)])
                        ])
                    }
                })
            }

            if (typeof pipe.value === 'string') {
                return h('div', {style:{display:'flex', alignItems: 'baseline'}, on: {click: [SELECT_PIPE, ref.id]}}, [
                    h('span', {style: {flex: '0 0 auto', position: 'relative', transform: 'translateZ(0)'}}, [
                        h('span', {style: {opacity: '0', display: 'inline-block', whiteSpace: 'pre', padding: '0 5px 2px 5px', borderBottom: '2px solid white'}}, pipe.value),
                        h('input', {
                            attrs: {
                                type: 'text'
                            },
                            style: {
                                color: 'white',
                                outline: 'none',
                                boxShadow: 'none',
                                textAlign: 'center',
                                display: 'inline',
                                border: 'none',
                                borderBottom: '2px solid white',
                                background: 'none',
                                font: 'inherit',
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                width: '100%',
                                flex: '0 0 auto',
                            },
                            on: {
                                input: [CHANGE_STATIC_VALUE, ref, 'value', 'text'],
                                mousemove: [PIPE_HOVERED, ref],
                                mouseout: [PIPE_UNHOVERED],
                            },
                            liveProps: {
                                value: pipe.value,
                            },
                        }),
                    ]),
                    ...listTransformations(pipe.transformations, pipe.type),
                ])
            }

            if (pipe.value === true || pipe.value === false) {
                return h('select', {liveProps: {value:  pipe.value.toString()}, style: {
                    background: 'none',
                    outline: 'none',
                    display: 'inline',
                    flex: '1',
                    minWidth: '50px',
                    border: 'none',
                    color: 'white',
                    boxShadow: 'inset 0 -2px 0 0 #828282',
                },  on: {click: [SELECT_PIPE, ref.id], input: [CHANGE_STATIC_VALUE, ref, 'value', 'boolean'], mousemove: [PIPE_HOVERED, ref], mouseout: [PIPE_UNHOVERED]}}, [
                    h('option', {attrs: {value: 'true'}, style: {color: 'black'}}, ['true']),
                    h('option', {attrs: {value: 'false'}, style: {color: 'black'}}, ['false']),
                ])
            }

            if (!isNaN(parseFloat(Number(pipe.value))) && isFinite(Number(pipe.value))) {
                return h('div', {style:{display:'flex', alignItems: 'baseline'}, on: {click: [SELECT_PIPE, ref.id]}}, [
                    h('span', {style: {flex: '0 0 auto', position: 'relative', transform: 'translateZ(0)'}}, [
                        h('span', {style: {opacity: '0', display: 'inline-block', whiteSpace: 'pre', padding: '0 5px 2px 5px', borderBottom: '2px solid white'}}, Number(pipe.value)),
                        h('input', {
                            attrs: {type:'number'},
                            style: {
                                color: 'white',
                                outline: 'none',
                                boxShadow: 'none',
                                textAlign: 'center',
                                display: 'inline',
                                border: 'none',
                                borderBottom: '2px solid white',
                                background: 'none',
                                font: 'inherit',
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                width: '100%',
                                flex: '0 0 auto',
                            },
                            on: {
                                input: [CHANGE_STATIC_VALUE, ref, 'value', 'number'],
                                mousemove: [PIPE_HOVERED, ref],
                                mouseout: [PIPE_UNHOVERED],
                            },
                            liveProps: {
                                value: Number(pipe.value),
                            },
                        }),
                    ]),
                    ...listTransformations(pipe.transformations, pipe.type),
                ])
            }

            if(pipe.value.ref === 'state'){
                const displState = state.definition[pipe.value.ref][pipe.value.id]
                return h('div', {style: {flex: '1'}}, [
                    h('div', {style:{display:'flex', alignItems: 'center'}, on: {click: [SELECT_PIPE, ref.id], mousemove: [PIPE_HOVERED, ref], mouseout: [PIPE_UNHOVERED],}}, [
                        h('span', {style: {whiteSpace: 'nowrap',flex: '0 0 auto', display: 'inline-block', position: 'relative', transform: 'translateZ(0)', boxShadow: 'inset 0 0 0 2px ' + (state.selectedStateNodeId === pipe.value.id? '#eab65c': '#828282') , background: '#444', padding: '4px 7px',}}, [
                            h('span', {style: {color: 'white', display: 'inline-block'}, on: {click: [STATE_NODE_SELECTED, pipe.value.id]}}, displState.title),
                        ]),
                        state.selectedPipeId === ref.id ? h('span', {style: {flex: '0 0 auto', marginLeft: 'auto'}, on: {click: [ADD_DEFAULT_TRANSFORMATION, state.selectedPipeId]}}, [addCircleIcon()]): h('span'),
                        state.selectedPipeId === ref.id ? h('span', {style: {flex: '0 0 auto',}, on: {click: [RESET_PIPE, ref.id]}}, [deleteIcon()]): h('span'),

                    ]),
                    ...listTransformations(pipe.transformations, pipe.type),
                    //h('div', state.selectedPipeId === ref.id ? genTransformators(): [])
                ])
            }

            if(pipe.value.ref === 'eventData'){
                const eventData = state.definition[pipe.value.ref][pipe.value.id]
                return h('div', [h('div', {style:{display:'flex', alignItems: 'center'}, on: {click: [SELECT_PIPE, ref.id]}}, [
                    h('div', {style: {flex: '1'}},
                        [h('div',{
                                style: { cursor: 'pointer', color: state.selectedStateNodeId === pipe.value.id ? '#eab65c': 'white', padding: '2px 5px', margin: '3px 3px 0 0', border: '2px solid ' + (state.selectedStateNodeId === pipe.value.id ? '#eab65c': 'white'), display: 'inline-block'},
                                on: {click: [STATE_NODE_SELECTED, pipe.value.id]}
                            },
                            [eventData.title])
                        ]
                    ),
                ]),
                    h('div', {style: {paddingLeft: '15px'}}, listTransformations(pipe.transformations, pipe.type)),
                ])
            }
        }

        function listState(stateId) {
            const currentState = state.definition.state[stateId]
            function editingNode() {
                return h('input', {
                    style: {
                        color: 'white',
                        outline: 'none',
                        padding: '4px 7px',
                        boxShadow: 'none',
                        display: 'inline',
                        border: 'none',
                        background: 'none',
                        font: 'inherit',
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        flex: '0 0 auto',
                    },
                    on: {
                        input: [CHANGE_STATE_NODE_TITLE, stateId],
                    },
                    liveProps: {
                        value: currentState.title,
                    },
                    attrs: {
                        'data-istitleeditor': true
                    }
                })
            }
            return h('div', {
                    style: {
                        cursor: 'pointer',
                        position: 'relative',
                    },
                },
                [
                    h('span', {style: {display: 'flex', flexWrap: 'wrap', marginTop: '6px'}}, [
                        h('span', {style: {flex: '0 0 auto',  position: 'relative', transform: 'translateZ(0)', margin: '0 7px 0 0',  boxShadow: 'inset 0 0 0 2px ' + (state.selectedStateNodeId === stateId ? '#eab65c': '#828282') , background: '#444', padding: '4px 7px',}}, [
                            h('span', {style: {opacity: state.editingTitleNodeId === stateId ? '0': '1', color: 'white', display: 'inline-block'}, on: {mousedown: [STATE_DRAGGED, stateId], touchstart: [STATE_DRAGGED, stateId], touchmove: [HOVER_MOBILE], dblclick: [EDIT_VIEW_NODE_TITLE, stateId]}}, currentState.title),
                            state.editingTitleNodeId === stateId ? editingNode(): h('span'),
                        ]),
                        (()=> {
                            const noStyleInput = {
                                color: currentRunningState[stateId] !== state.definition.state[stateId].defaultValue ? 'rgb(91, 204, 91)' : 'white',
                                background: 'none',
                                outline: 'none',
                                display: 'inline',
                                flex: '1',
                                minWidth: '50px',
                                border: 'none',
                                boxShadow: 'inset 0 -2px 0 0 ' + (state.selectedStateNodeId === stateId ? '#eab65c': '#828282')
                            }
                            if(currentState.type === 'text') return h('input', {attrs: {type: 'text'}, liveProps: {value: currentRunningState[stateId]}, style: noStyleInput, on: {input: [CHANGE_CURRENT_STATE_TEXT_VALUE, stateId]}})
                            if(currentState.type === 'number') return h('input', {attrs: {type: 'number'}, liveProps: {value: currentRunningState[stateId]}, style: noStyleInput,  on: {input: [CHANGE_CURRENT_STATE_NUMBER_VALUE, stateId]}})
                            if(currentState.type === 'boolean') return h('select', {liveProps: {value: currentRunningState[stateId].toString()}, style: noStyleInput,  on: {input: [CHANGE_CURRENT_STATE_BOOLEAN_VALUE, stateId]}}, [
                                h('option', {attrs: {value: 'true'}, style: {color: 'black'}}, ['true']),
                                h('option', {attrs: {value: 'false'}, style: {color: 'black'}}, ['false']),
                            ])
                            if(currentState.type === 'table') {
                                if(state.selectedStateNodeId !== stateId){
                                    return h('div', {key: 'icon',on: {click: [STATE_NODE_SELECTED, stateId]}, style: {display: 'flex', alignItems: 'center', marginTop: '7px'}}, [listIcon()])
                                }
                                const table = currentRunningState[stateId];
                                return h('div', {
                                        key: 'table',
                                        style: {
                                            background: '#828183',
                                            width: '100%',
                                            flex: '0 0 100%'
                                        }
                                    },[
                                        h('div', {style: {display: 'flex'}},  Object.keys(currentState.definition).map(key =>
                                                h('div', {style: {flex: '1', padding: '2px 5px', borderBottom: '2px solid white'}}, key)
                                            )
                                        ),
                                        ...Object.keys(table).map(id =>
                                            h('div', {style: {display: 'flex'}}, Object.keys(table[id]).map(key =>
                                                h('div', {style: {flex: '1', padding: '2px 5px'}}, table[id][key])
                                            ))
                                        )
                                    ]
                                )
                            }
                        })(),
                        currentRunningState[stateId] !== state.definition.state[stateId].defaultValue ? h('div', {style: {display: 'inline-flex', alignSelf: 'center'}, on: {click: [SAVE_DEFAULT, stateId]}}, [saveIcon()]): h('span'),
                        state.selectedStateNodeId === stateId ? h('div', {style: {color: '#eab65c', display: 'inline-flex', alignSelf: 'center'}, on: {click: [DELETE_STATE, stateId]}}, [deleteIcon()]): h('span')
                    ]),
                    state.selectedStateNodeId === stateId ?
                        h('span',
                            currentState.mutators.map(mutatorRef => {
                                    const mutator = state.definition[mutatorRef.ref][mutatorRef.id]
                                    const event = state.definition[mutator.event.ref][mutator.event.id]
                                    const emitter = state.definition[event.emitter.ref][event.emitter.id]
                                    return h('div', {style: {
                                        display: 'flex',
                                        cursor: 'pointer',
                                        alignItems: 'center',
                                        background: '#444',
                                        paddingTop: '3px',
                                        paddingBottom: '3px',
                                        color: state.selectedViewNode.id === event.emitter.id ? '#53B2ED': 'white',
                                        transition: '0.2s all',
                                        minWidth: '100%',
                                    }, on: {click: [VIEW_NODE_SELECTED, event.emitter]}}, [
                                        h('span', {style: {flex: '0 0 auto', margin: '0 3px 0 5px', display: 'inline-flex'}}, [
                                            event.emitter.ref === 'vNodeBox' ? boxIcon() :
                                                event.emitter.ref === 'vNodeList' ? listIcon() :
                                                    event.emitter.ref === 'vNodeList' ? ifIcon() :
                                                        event.emitter.ref === 'vNodeInput' ? inputIcon() :
                                                            textIcon(),
                                        ]),
                                        h('span', {style: {flex: '5 5 auto', margin: '0 5px 0 0', minWidth: '0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}, emitter.title),
                                        h('span', {style: {flex: '0 0 auto', marginLeft: 'auto', marginRight: '5px', color: '#5bcc5b'}}, event.type),
                                    ])
                                }
                            )) :
                        h('span'),
                ]
            )
        }

        function fakeState(stateId) {
            const currentState = state.definition.state[stateId]
            return h('span', {style: {flex: '0 0 auto',  position: 'relative', transform: 'translateZ(0)', margin: '7px 7px 0 0',  boxShadow: 'inset 0 0 0 2px ' + (state.selectedStateNodeId === stateId ? '#eab65c': '#828282') , background: '#444', padding: '4px 7px',}}, [
                h('span', {style: {color: 'white', display: 'inline-block'}}, currentState.title),
            ])
        }
        const addStateComponent = h('div', {style: { flex: '0 auto', borderRight: 'none', height: '40px', display: 'flex', alignItems: 'center'}}, [
            h('span', {style: { cursor: 'pointer', padding: '0 5px'}}, 'add state: '),
            h('span', {style: {display: 'inline-block'}, on: {click: [ADD_STATE, '_rootNameSpace', 'text']}}, [textIcon()]),
            h('span', {on: {click: [ADD_STATE, '_rootNameSpace', 'number']}}, [numberIcon()]),
            h('span', {on: {click: [ADD_STATE, '_rootNameSpace', 'boolean']}}, [ifIcon()]),
            //h('span', {on: {click: [ADD_STATE, '_rootNameSpace', 'table']}}, [listIcon()]),
        ])

        const stateComponent = h('div', {key: 'state', attrs: {class: 'better-scrollbar'}, style: {overflow: 'auto', flex: '1', padding: '0 10px'}, on: {click: [UNSELECT_STATE_NODE]}}, [addStateComponent, ...state.definition.nameSpace['_rootNameSpace'].children.map((ref)=> listState(ref.id))])

        function listNode(nodeRef, parentRef, depth){
            if(nodeRef.id === '_rootNode') return listRootNode(nodeRef)
            if(nodeRef.ref === 'vNodeText') return simpleNode(nodeRef, parentRef, depth)
            if(nodeRef.ref === 'vNodeImage') return simpleNode(nodeRef, parentRef, depth)
            if(nodeRef.ref === 'vNodeBox' || nodeRef.ref === 'vNodeList' || nodeRef.ref === 'vNodeIf') return listBoxNode(nodeRef, parentRef, depth)
            if(nodeRef.ref === 'vNodeInput') return simpleNode(nodeRef, parentRef, depth)
        }

        function prevent_bubbling(e) {
            e.stopPropagation()
        }
        function editingNode(nodeRef) {
            return h('input', {
                style: {
                    border: 'none',
                    height: '26px',
                    background: 'none',
                    color: '#53B2ED',
                    outline: 'none',
                    flex: '1',
                    padding: '0',
                    boxShadow: 'inset 0 -1px 0 0 #53B2ED',
                    font: 'inherit',
                    paddingLeft: '2px',
                },
                on: {
                    mousedown: prevent_bubbling,
                    input: [CHANGE_VIEW_NODE_TITLE, nodeRef],
                },
                liveProps: {
                    value: state.definition[nodeRef.ref][nodeRef.id].title,
                },
                attrs: {
                    autofocus: true,
                    'data-istitleeditor': true
                }
            })
        }

        function listRootNode(nodeRef) {
            const nodeId = nodeRef.id
            const node = state.definition[nodeRef.ref][nodeId]
            return h('div', {
                    style: {
                        position: 'relative',
                    },
                }, [
                    h('div', {style: {
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                        paddingRight: '8px',
                        height: '26px',
                        whiteSpace: 'nowrap',
                    },
                        on: {mousemove: [VIEW_HOVERED, nodeRef, {}, 1], touchmove: [HOVER_MOBILE]}
                    },  [
                        h('span', {key: nodeId, style: {color: state.selectedViewNode.id === nodeId ? '#53B2ED': '#bdbdbd', display: 'inline-flex'}, on: {click: [VIEW_NODE_SELECTED, nodeRef]}}, [
                            appIcon()
                        ]),
                        state.editingTitleNodeId === nodeId ?
                            editingNode(nodeRef):
                            h('span', { style: {flex: '1', cursor: 'pointer', color: state.selectedViewNode.id === nodeId ? '#53B2ED': 'white', transition: 'color 0.2s', paddingLeft: '2px'}, on: {click: [VIEW_NODE_SELECTED, nodeRef], dblclick: [EDIT_VIEW_NODE_TITLE, nodeId]}}, node.title),
                    ]),
                    h('div', state.hoveredViewNode && state.hoveredViewNode.parent.id === nodeId && !(node.children.findIndex((ref)=> ref.id === state.draggedComponentView.id) === state.hoveredViewNode.position) ?
                        (()=>{
                            // copy pasted from listBoxNode
                            const oldPosition = node.children.findIndex((ref)=> ref.id === state.draggedComponentView.id)
                            const newPosition = oldPosition === -1 || state.hoveredViewNode.position < oldPosition ? state.hoveredViewNode.position : state.hoveredViewNode.position + 1
                            const children = node.children.map((ref)=>listNode(ref, nodeRef, 1))
                            return children.slice(0, newPosition).concat(spacerComponent(), children.slice(newPosition))
                        })():
                        node.children.map((ref)=>listNode(ref, nodeRef, 1))
                    ),
                    h('div', {style: {
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '8px',
                            paddingRight: '8px',
                            height: '15px',
                        },
                            on: {mousemove: [VIEW_HOVERED, {id: '_lastNode'}, {}, 1], touchmove: [HOVER_MOBILE]}}
                    ),
                ]
            )
        }

        function listBoxNode(nodeRef, parentRef, depth) {
            const nodeId = nodeRef.id
            const node = state.definition[nodeRef.ref][nodeId]
            return h('div', {style: {
                    opacity: state.draggedComponentView && state.draggedComponentView.id === nodeId ? '0.5' : '1.0',
                }}, [
                    h('div', {
                        key: nodeId,
                        style: {
                            display: 'flex',
                            height: '26px',
                            position: 'relative',
                            alignItems: 'center',
                            paddingLeft: (depth - (node.children.length > 0 || (state.hoveredViewNode && state.hoveredViewNode.parent.id === nodeId) ? 1: 0)) *20 + 8+ 'px',
                            paddingRight: '8px',
                            whiteSpace: 'nowrap',
                            color: state.selectedViewNode.id === nodeId ? '#53B2ED': 'white'
                        },
                        on: {mousedown: [VIEW_DRAGGED, nodeRef, parentRef, depth], touchstart: [VIEW_DRAGGED, nodeRef, parentRef, depth], mousemove: [VIEW_HOVERED, nodeRef, parentRef, depth], touchmove: [HOVER_MOBILE]}}, [
                        node.children.length > 0 || (state.hoveredViewNode && state.hoveredViewNode.parent.id === nodeId) ? h('span', {style: {display: 'inline-flex'}}, [arrowIcon(state.viewFoldersClosed[nodeId] || (state.draggedComponentView && nodeId === state.draggedComponentView.id))]): h('span'),
                        h('span', {key: nodeId, style: {display: 'inline-flex', color: state.selectedViewNode.id === nodeId ? '#53B2ED': '#bdbdbd', transition: 'color 0.2s'}}, [
                            nodeRef.ref === 'vNodeBox' ? boxIcon() :
                                nodeRef.ref === 'vNodeList' ? listIcon() :
                                    ifIcon()
                        ]),
                        state.editingTitleNodeId === nodeId ?
                            editingNode(nodeRef):
                            h('span', { style: {flex: '1', cursor: 'pointer', transition: 'color 0.2s', paddingLeft: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}, on: {dblclick: [EDIT_VIEW_NODE_TITLE, nodeId]}}, node.title),
                        h('div', {style: {color: '#53B2ED', cursor: 'pointer', display: state.selectedViewNode.id === nodeId ? 'inline-flex': 'none', flex: '0 0 auto'}}, [deleteIcon()]),
                        h('div', {style: {color: '#eab65c', display: state.selectedStateNodeId && lookForSelectedState(nodeRef) ? 'inline-flex': 'none', flex: '0 0 auto'}}, [warningIcon()]),
                    ]),
                    h('div', {
                            style: { display: state.viewFoldersClosed[nodeId] || (state.draggedComponentView && nodeId === state.draggedComponentView.id) ? 'none': 'block'},
                        }, state.hoveredViewNode && state.hoveredViewNode.parent.id === nodeId && !(node.children.findIndex((ref)=> ref.id === state.draggedComponentView.id) === state.hoveredViewNode.position) ?
                            (()=>{
                                // adds a fake component
                                const oldPosition = node.children.findIndex((ref)=> ref.id === state.draggedComponentView.id) // this is needed because we still show the old node
                                const newPosition = oldPosition === -1 || state.hoveredViewNode.position < oldPosition ? state.hoveredViewNode.position : state.hoveredViewNode.position + 1
                                const children = node.children.map((ref)=>listNode(ref, nodeRef, depth+1))
                                return children.slice(0, newPosition).concat(spacerComponent(), children.slice(newPosition))
                            })():
                            node.children.map((ref)=>listNode(ref, nodeRef, depth+1))
                    ),
                ]
            )
        }
        function simpleNode(nodeRef, parentRef, depth) {
            const nodeId = nodeRef.id
            const node = state.definition[nodeRef.ref][nodeId]
            return h('div', {
                    key: nodeId,
                    style: {
                        cursor: 'pointer',
                        opacity: state.draggedComponentView && state.draggedComponentView.id === nodeId ? '0.5' : '1.0',
                        position: 'relative',
                        height: '26px',
                        paddingLeft: depth *20 + 8 +'px',
                        paddingRight: '8px',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        color: state.selectedViewNode.id === nodeId ? '#53B2ED': '#bdbdbd',
                    },
                    on: {mousedown: [VIEW_DRAGGED, nodeRef, parentRef, depth], touchstart: [VIEW_DRAGGED, nodeRef, parentRef, depth], dblclick: [EDIT_VIEW_NODE_TITLE, nodeId], mousemove: [VIEW_HOVERED, nodeRef, parentRef, depth], touchmove: [HOVER_MOBILE]}
                }, [
                    nodeRef.ref === 'vNodeInput' ? inputIcon() :
                        nodeRef.ref === 'vNodeImage' ? imageIcon() :
                            textIcon(),
                    state.editingTitleNodeId === nodeId ?
                        editingNode(nodeRef):
                        h('span', {style: {flex: '1', color: state.selectedViewNode.id === nodeId ? '#53B2ED': 'white', transition: 'color 0.2s', paddingLeft: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}, node.title),
                    h('div', {style: {color: '#53B2ED', cursor: 'pointer', display: state.selectedViewNode.id === nodeId ? 'inline-flex': 'none', flex: '0 0 auto'}}, [deleteIcon()]),
                    h('div', {style: {color: '#eab65c', display: state.selectedStateNodeId && lookForSelectedState(nodeRef) ? 'inline-flex': 'none', flex: '0 0 auto'}}, [warningIcon()]),
                ]
            )
        }

        function spacerComponent(){
            return h('div', {
                key: 'spacer',
                style: {
                    cursor: 'pointer',
                    height: '6px',
                    boxShadow: 'inset 0 0 1px 1px #53B2ED',
                },
            })
        }
        function fakeComponent(nodeRef, depth,) {
            const nodeId = nodeRef.id
            const node = state.definition[nodeRef.ref][nodeId]
            return h('div', {
                    key: '_fake'+nodeId,
                    style: {
                        cursor: 'pointer',
                        transition: 'padding-left 0.2s',
                        height: '26px',
                        paddingLeft: (depth - (node.children && node.children.length > 0 ? 1: 0)) *20 + 8 +'px',
                        paddingRight: '8px',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        color: state.selectedViewNode.id === nodeId ? '#53B2ED': '#bdbdbd',
                    },
                }, [
                    (nodeRef.ref === 'vNodeBox' || nodeRef.ref === 'vNodeList' || nodeRef.ref === 'vNodeIf') && node.children.length > 0  ? arrowIcon(true): h('span', {key: '_fakeSpan'+nodeId}),
                    nodeRef.ref === 'vNodeBox' ? boxIcon() :
                        nodeRef.ref === 'vNodeList' ? listIcon() :
                            nodeRef.ref === 'vNodeIf' ? ifIcon():
                                nodeRef.ref === 'vNodeInput' ? inputIcon() :
                                    nodeRef.ref === 'vNodeImage' ? imageIcon() :
                                        textIcon(),
                    h('span', {style: {flex: '1', color: state.selectedViewNode.id === nodeId ? '#53B2ED': 'white', transition: 'color 0.2s', paddingLeft: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}, node.title),
                ]
            )
        }

        function generateEditNodeComponent() {
            const styles = fields.style
            const selectedNode = state.definition[state.selectedViewNode.ref][state.selectedViewNode.id]

            const propsComponent = h('div', {
                style: {
                    background: state.selectedViewSubMenu === 'props' ? '#4d4d4d': '#3d3d3d',
                    padding: '10px 0',
                    flex: '1',
                    cursor: 'pointer',
                    textAlign: 'center',
                },
                on: {
                    click: [SELECT_VIEW_SUBMENU, 'props']
                }
            }, 'data')
            const styleComponent = h('div', {
                style: {
                    background: state.selectedViewSubMenu === 'style' ? '#4d4d4d': '#3d3d3d',
                    padding: '10px 0',
                    flex: '1',
                    borderRight: '1px solid #222',
                    borderLeft: '1px solid #222',
                    textAlign: 'center',
                    cursor: 'pointer',
                },
                on: {
                    click: [SELECT_VIEW_SUBMENU, 'style']
                }
            }, 'style')
            const eventsComponent = h('div', {
                style: {
                    background: state.selectedViewSubMenu === 'events' ? '#4d4d4d': '#3d3d3d',
                    padding: '10px 0',
                    flex: '1',
                    textAlign: 'center',
                    cursor: 'pointer',
                },
                on: {
                    click: [SELECT_VIEW_SUBMENU, 'events']
                }
            }, 'events')

            const genpropsSubmenuComponent = () => h('div', [(()=>{
                if (state.selectedViewNode.ref === 'vNodeBox') {
                    return h('div', {
                        style: {
                            textAlign: 'center',
                            marginTop: '100px',
                            color: '#bdbdbd'
                        }
                    }, 'no data required')
                }
                if (state.selectedViewNode.ref === 'vNodeText') {
                    return h('div', {style: {overflow: 'auto'}, attrs: {"class": 'better-scrollbar'}}, [
                        h('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                background: '#676767',
                                padding: '5px 10px',
                                marginBottom: '10px'
                            }
                        }, [
                            h('span', {style: {flex: '1'}}, 'text value'),
                            h('div', {style: {flex: '0', cursor: 'default', color: '#bdbdbd'}}, 'text')
                        ]),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.value, 'text')])
                    ])
                }
                if (state.selectedViewNode.ref === 'vNodeImage') {
                    return h('div', {style: {overflow: 'auto'}, attrs: {"class": 'better-scrollbar'}}, [
                        h('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                background: '#676767',
                                padding: '5px 10px',
                                marginBottom: '10px'
                            }
                        }, [
                            h('span', {style: {flex: '1'}}, 'source (url)'),
                            h('div', {style: {flex: '0', cursor: 'default', color: '#bdbdbd'}}, 'text')
                        ]),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.src, 'text')])
                    ])
                }
                if (state.selectedViewNode.ref === 'vNodeInput') {
                    return h('div', {style: {overflow: 'auto'}, attrs: {"class": 'better-scrollbar'}}, [
                        h('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                background: '#676767',
                                padding: '5px 10px',
                                marginBottom: '10px'
                            }
                        }, [
                            h('span', {style: {flex: '1'}}, 'input value'),
                            h('div', {style: {flex: '0', cursor: 'default', color: '#bdbdbd'}}, 'text')
                        ]),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.value, 'text')])
                    ])
                }
                if (state.selectedViewNode.ref === 'vNodeList') {
                    return h('div', {style: {overflow: 'auto'}, attrs: {"class": 'better-scrollbar'}}, [
                        h('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                background: '#676767',
                                padding: '5px 10px',
                                marginBottom: '10px'
                            }
                        }, [
                            h('span', {style: {flex: '1'}}, 'table'),
                            h('div', {style: {flex: '0', cursor: 'default', color: '#bdbdbd'}}, 'table')
                        ]),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.value, 'table')])
                    ])
                }
                if (state.selectedViewNode.ref === 'vNodeIf') {
                    return h('div', {style: {overflow: 'auto'}, attrs: {"class": 'better-scrollbar'}}, [
                        h('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                background: '#676767',
                                padding: '5px 10px',
                                marginBottom: '10px'
                            }
                        }, [
                            h('span', {style: {flex: '1'}}, 'predicate'),
                            h('div', {style: {flex: '0', cursor: 'default', color: '#bdbdbd'}}, 'true/false')
                        ]),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.value, 'boolean')])
                    ])
                }
            })()])
            const genstyleSubmenuComponent = () => {
                const selectedStyle = state.definition.style[selectedNode.style.id]
                return h('div', {attrs: {class: 'better-scrollbar'}, style: {overflow: 'auto'}}, [
                    h('div',{ style: {padding: '10px', color: '#bdbdbd'}}, 'style panel will change a lot in 1.0v, right now it\'s just CSS'),
                    ...Object.keys(selectedStyle).map((key) => h('div', {style: {
                    }}, [
                        h('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                background: '#676767',
                                padding: '5px 10px',
                                marginBottom: '10px'
                            }
                        }, [
                            h('span', {style: {flex: '1'}}, key),
                            h('div', {style: {flex: '0', cursor: 'default', color: '#bdbdbd'}}, 'text')
                        ]),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedStyle[key], 'text')]),
                    ])),
                    h('div', {style: { padding: '5px 10px', color: '#bdbdbd'}}, 'add Style:'),
                    h('div', {style: { padding: '5px 0 5px 10px'}},
                        styles
                            .filter((key) => !Object.keys(selectedStyle).includes(key))
                            .map((key) => h('div', {
                                on: {click: [ADD_DEFAULT_STYLE, selectedNode.style.id, key]},
                                style: {
                                    cursor: 'pointer',
                                    border: '3px solid white',
                                    padding: '5px',
                                    marginTop: '5px'
                                }
                            }, '+ ' + key))
                    )
                ])
            }
            const geneventsSubmenuComponent = () => {

                const availableEvents = getAvailableEvents(state.selectedViewNode.ref)
                const currentEvents = availableEvents.filter((event) => selectedNode[event.propertyName])
                const eventsLeft = availableEvents.filter((event) => !selectedNode[event.propertyName])
                return h('div', {attrs: {class: 'better-scrollbar'}, style: {overflow: 'auto'}}, [
                        ...(currentEvents.length ?
                            currentEvents.map((eventDesc) => {
                                const event = state.definition[selectedNode[eventDesc.propertyName].ref][selectedNode[eventDesc.propertyName].id]
                                return h('div', [
                                    h('div', {style: {background: '#676767', padding: '5px 10px', display: 'flex', justifyContent: 'space-between'}, on: {mousemove: [EVENT_HOVERED, selectedNode[eventDesc.propertyName]], mouseout: [EVENT_UNHOVERED]}}, [h('span', event.type), h('span', {style:{color: '#bdbdbd'}}, '(drop state here)')]),
                                    eventDesc.description === 'input' ? h('div',{ style: {padding: '10px 10px 0 10px', color: '#bdbdbd'}}, 'Hey, input is using event data, but we are currently working on this part. Some functionality might still be missing') : h('span'),
                                    event.mutators.length === 0 ? h('div', {style: { margin: '10px 0', padding: '5px 10px', color: '#bdbdbd'}}, ['No transformations. Drag state on event']) :
                                        h('div',
                                            {style: {
                                                color: 'white',
                                                transition: 'color 0.2s',
                                                cursor: 'pointer',
                                            },
                                            }, event.mutators.map(mutatorRef => {
                                                const mutator = state.definition[mutatorRef.ref][mutatorRef.id]
                                                const stateDef = state.definition[mutator.state.ref][mutator.state.id]
                                                return h('div', {style: {padding: '15px 10px', borderBottom: '2px solid #929292', display: 'flex', alignItems: 'center'}}, [
                                                    h('span', {style: {flex: '0 0 auto', display: 'inline-block', position: 'relative', transform: 'translateZ(0)', boxShadow: 'inset 0 0 0 2px ' + (state.selectedStateNodeId === mutator.state.id ? '#eab65c': '#828282') , background: '#444', padding: '4px 7px',}}, [
                                                        h('span', {style: {color: 'white', display: 'inline-block'}, on: {click: [STATE_NODE_SELECTED, mutator.state.id]}}, stateDef.title),
                                                    ]),
                                                    h('span', {style: {color: 'white', fontSize: '1.8em', padding: '10px'}}, '='),
                                                    emberEditor(mutator.mutation, stateDef.type)
                                                ])
                                            })
                                        )
                                ])
                            }) :
                            []),
                        h('div', {style: { marginTop: '10px', padding: '5px 10px',  color: '#bdbdbd'}}, 'add Event:'),
                        h('div',  {style: { padding: '5px 0 5px 10px'}}, [
                            ...eventsLeft.map((event) =>
                                h('div', {
                                    style: {
                                        border: '3px solid #5bcc5b',
                                        cursor: 'pointer',
                                        padding: '5px',
                                        margin: '10px'
                                    }, on: {click: [ADD_EVENT, event.propertyName, state.selectedViewNode]}
                                }, '+ ' + event.description),
                            ),
                        ]),
                    ]
                )
            }

            const fullVNode = ['vNodeBox','vNodeText', 'vNodeImage', 'vNodeInput'].includes(state.selectedViewNode.ref)

            return h('div', {
                style: {
                    position: 'fixed',
                    lineHeight: '1.2em',
                    color: 'white',
                    left: state.componentEditorPosition.x + 'px',
                    top: state.componentEditorPosition.y + 'px',
                    height: '50%',
                    display: 'flex',
                    zIndex: '3000',
                }
            }, [
                h('div', {style: {flex: '1', display: 'flex', marginBottom: '10px', flexDirection: 'column', background: '#4d4d4d', width: state.subEditorWidth + 'px', border: '3px solid #222'}},[
                    h('div', {style: {flex: '0 0 auto',}}, [
                        h('div', {style: {
                            display: 'flex',
                            cursor: 'default',
                            alignItems: 'center',
                            background: '#222',
                            paddingTop: '2px',
                            paddingBottom: '5px',
                            color: '#53B2ED',
                            minWidth: '100%',
                        }, on: {
                            mousedown: [COMPONENT_VIEW_DRAGGED],
                            touchstart: [COMPONENT_VIEW_DRAGGED],
                        },}, [
                            h('span', {style: {flex: '0 0 auto', margin: '0 2px 0 5px', display: 'inline-flex'}}, [
                                state.selectedViewNode.id === '_rootNode' ? appIcon() :
                                    state.selectedViewNode.ref === 'vNodeBox' ? boxIcon() :
                                        state.selectedViewNode.ref === 'vNodeList' ? listIcon() :
                                            state.selectedViewNode.ref === 'vNodeList' ? ifIcon() :
                                                state.selectedViewNode.ref === 'vNodeInput' ? inputIcon() :
                                                    state.selectedViewNode.ref === 'vNodeImage' ? imageIcon() :
                                                        textIcon(),
                            ]),
                            h('span', {style: {flex: '5 5 auto', margin: '0 5px 0 0', minWidth: '0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}, selectedNode.title),
                            h('span', {style: {flex: '0 0 auto', marginLeft: 'auto', cursor: 'pointer', marginRight: '5px', color: 'white', display: 'inline-flex'}, on: {mousedown: [UNSELECT_VIEW_NODE, false, true], touchstart: [UNSELECT_VIEW_NODE, false, true]}}, [clearIcon()]),
                        ])
                    ]),
                    fullVNode ? h('div', {style: { display: 'flex', flex: '0 0 auto'}}, [propsComponent, styleComponent, eventsComponent]) : h('span'),
                    dragSubComponentRight,
                    dragSubComponentLeft,
                    state.selectedViewSubMenu === 'props' || !fullVNode ? genpropsSubmenuComponent():
                        state.selectedViewSubMenu === 'style' ? genstyleSubmenuComponent():
                            state.selectedViewSubMenu === 'events' ? geneventsSubmenuComponent():
                                h('span', 'Error, no such menu')
                ])
            ])
        }

        const addViewNodeComponent = h('div', {style: {fontSize: '32px', flex: '0 auto', height: '40px', display: 'flex', alignItems: 'center', padding: '20px 0', justifyContent: 'space-between'}}, [
            h('span', {on: {click: [ADD_NODE, state.selectedViewNode, 'box']}}, [boxIcon()]),
            h('span', {on: {click: [ADD_NODE, state.selectedViewNode, 'input']}}, [inputIcon()]),
            h('span', {on: {click: [ADD_NODE, state.selectedViewNode, 'text']}}, [textIcon()]),
            h('span', {on: {click: [ADD_NODE, state.selectedViewNode, 'image']}}, [imageIcon()]),
            h('span', {on: {click: [ADD_NODE, state.selectedViewNode, 'if']}}, [ifIcon()]),
            h('span', {on: {click: [ADD_NODE, state.selectedViewNode, 'if']}}, [moreIcon()]), // TODO
        ])

        const viewComponent = h('div', {key: 'view', attrs: {class: 'better-scrollbar'}, style: {overflow: 'auto', position: 'relative', flex: '1', padding: '20px'}}, [
            h('div', {style: {fontSize: '14px', fontWeight: 'bold', color: '#8e8e8e'}}, 'ADD NEW'),
            addViewNodeComponent,
            listNode({ref: 'vNodeBox', id:'_rootNode'}, {}, 0),
        ])

        const eventComponent = h('div', {key: 'event', attrs: {class: 'better-scrollbar'}, style: {overflow: 'auto', position: 'relative', flex: '1'}}, [
            h('div', {
                on: {
                    click: FREEZER_CLICKED
                },
                style: {
                    flex: '0 auto',
                    padding: '10px',
                    textAlign: 'center',
                    background: '#333',
                    cursor: 'pointer',
                },
            }, [
                h('span', {style: { padding: '15px 15px 10px 15px', color: state.appIsFrozen ? 'rgb(91, 204, 91)' : 'rgb(204, 91, 91)'}}, state.appIsFrozen ? '►' : '❚❚'),
            ]),
            h('div', {
                    attrs: {class: 'better-scrollbar'},
                    style: {
                        flex: '1 auto',
                        overflow: 'auto'
                    }
                },
                state.eventStack
                    .filter((eventData)=>state.definition.event[eventData.eventId] !== undefined)
                    .reverse() // mutates the array, but it was already copied with filter
                    .slice(0, 21)
                    .map((eventData, index) => {
                        const event = state.definition.event[eventData.eventId]
                        const emitter = state.definition[event.emitter.ref][event.emitter.id]
                        // no idea why this key works, don't touch it, probably rerenders more than needed, but who cares
                        return h('div', {key: event.emitter.id + index, style: {marginBottom: '10px'}}, [
                            h('div', {style: {
                                display: 'flex',
                                marginBottom: '10px',
                                cursor: 'pointer',
                                alignItems: 'center',
                                background: '#444',
                                paddingTop: '3px',
                                paddingBottom: '3px',
                                color: state.selectedViewNode.id === event.emitter.id ? '#53B2ED': 'white',
                                transition: '0.2s all',
                                minWidth: '100%',
                            }, on: {click: [VIEW_NODE_SELECTED, event.emitter]}}, [
                                h('span', {style: {flex: '0 0 auto', margin: '0 0 0 5px', display: 'inline-flex'}}, [
                                    event.emitter.ref === 'vNodeBox' ? boxIcon() :
                                        event.emitter.ref === 'vNodeList' ? listIcon() :
                                            event.emitter.ref === 'vNodeList' ? ifIcon() :
                                                event.emitter.ref === 'vNodeInput' ? inputIcon() :
                                                    textIcon(),
                                ]),
                                h('span', {style: {flex: '5 5 auto', margin: '0 5px 0 0', minWidth: '0', overflow: 'hidden', whiteSpace: 'nowrap',  textOverflow: 'ellipsis'}}, emitter.title),
                                h('span', {style: {flex: '0 0 auto', marginLeft: 'auto', marginRight: '5px', color: '#5bcc5b'}}, event.type),
                            ]),
                            Object.keys(eventData.mutations).filter(stateId => state.definition.state[stateId] !== undefined).length === 0 ?
                                h('div', {style: { padding: '5px 10px', color: '#bdbdbd'}}, 'nothing has changed'):
                                h('div', {style: {paddingLeft: '10px', whiteSpace: 'nowrap'}}, Object.keys(eventData.mutations)
                                    .filter(stateId => state.definition.state[stateId] !== undefined)
                                    .map(stateId =>
                                        h('div', [
                                            h('span', {on: {click: [STATE_NODE_SELECTED, stateId]}, style: {cursor: 'pointer', color: 'white', boxShadow: 'inset 0 0 0 2px ' + (state.selectedStateNodeId === stateId ? '#eab65c': '#828282') , background: '#444', padding: '2px 5px', marginRight: '5px', display: 'inline-block', transition: 'all 0.2s'}}, state.definition.state[stateId].title),
                                            h('span', {style: {color: '#8e8e8e'}}, eventData.previousState[stateId].toString() + ' –› '),
                                            h('span', eventData.mutations[stateId].toString()),
                                        ])
                                    ))
                        ])
                    })
            )
        ])

        const rightTabsComponent = h('div', {style: {height: '50px', fontSize: '15px', fontWeight: '500', display: 'flex', letterSpacing: '1px', fontKerning: 'none'}}, [
            h('div', {style: {cursor: 'pointer', flex: '1', display:'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: state.selectedMenu === 'view'? 'inherit': '#303030', color: state.selectedMenu === 'view'? '#53d486': '#d4d4d4'}, on: {click: [CHANGE_MENU, 'view']}}, [h('span', 'VIEW')]),
            h('div', {style: {cursor: 'pointer', flex: '1', display:'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: state.selectedMenu === 'state'? 'inherit': '#303030', borderLeft: '2px solid #1e1e1e', borderRight: '2px solid #1e1e1e', color: state.selectedMenu === 'state'? '#53d486': '#d4d4d4'}, on: {click: [CHANGE_MENU, 'state']}}, [h('span', 'STATE')]),
            h('div', {style: {cursor: 'pointer', flex: '1', display:'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: state.selectedMenu === 'events'? 'inherit': '#303030', color: state.selectedMenu === 'events'? '#53d486': '#d4d4d4'}, on: {click: [CHANGE_MENU, 'events']}}, [h('span', 'EVENT LOG')]),
        ])
        
        const rightComponent =
            h('div', {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'fixed',
                    top: '50px',
                    right: '0',
                    color: 'white',
                    height: '100%',
                    lineHeight: '1.2em',
                    width: state.editorRightWidth + 'px',
                    background: '#1e1e1e',
                    boxSizing: "border-box",
                    borderLeft: '3px solid #222',
                    transition: '0.5s transform',
                    transform: state.rightOpen ? 'translateZ(0) translateX(0%)': 'translateZ(0) translateX(100%)',
                    userSelect: 'none',
                },
            }, [
                dragComponentRight,
                rightTabsComponent,
                state.selectedMenu === 'view' ? viewComponent:
                    state.selectedMenu === 'state' ? stateComponent:
                        eventComponent,
            ])

        const topComponent = h('div', {
            style: {
                flex: '1 auto',
                height: '50px',
                maxHeight: '50px',
                minHeight: '50px',
                background: '#f8f8f8',
                boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 6px, rgba(0, 0, 0, 0.12) 0px 1px 4px',
                display:'flex',
                justifyContent: 'center',
            }
        }, [
            h('a', {style: {flex: '0 auto', display: 'flex', alignItems: 'center', width: '190px', textDecoration: 'inherit', userSelect: 'none'}, attrs: {href:'/'}}, [
                h('img',{ attrs: {src: '/images/logo_new256x256.png', height: '37'}}),
            ]),
        ])

        const renderViewComponent = h('div', {
            style: {
                flex: '1 auto',
                backgroundPositionX: '0px, 8px, 0px, 8px',
                backgroundPositionY: '0px, 8px, 1px, 9px',
                backgroundColor:'#e9e9e9',
                backgroundSize:'16px 16px',
                display:'relative',
                overflow: 'auto',
            },
        }, [
            h('div', {style: (()=>{
                const topMenuHeight = 50
                const widthLeft = window.innerWidth - ((state.leftOpen ? state.editorLeftWidth: 0) + (state.rightOpen ? state.editorRightWidth : 0))
                const heightLeft = window.innerHeight - topMenuHeight
                return {
                    width: state.fullScreen ? '100vw' : widthLeft - 30 +'px',
                    height: state.fullScreen ? '100vh' : heightLeft - 30 + 'px',
                    background: '#ffffff',
                    transform: 'translateZ(0)',
                    zIndex: state.fullScreen ? '2000' : '100',
                    boxShadow: 'rgba(0, 0, 0, 0.16) 0px 3px 10px, rgba(0, 0, 0, 0.23) 0px 3px 10px',
                    position: 'fixed',
                    transition: state.fullScreen || state.editorRightWidth === 450 ? 'all 0.5s': 'none', // messes up the closing of full screen, but works in 99% of cases
                    top: state.fullScreen ? '0px' : 15 + topMenuHeight + 'px',
                    left: state.fullScreen ? '0px' : (state.leftOpen ?state.editorLeftWidth : 0) + 15 + 'px',
                }
            })()}, [
                state.fullScreen ?
                    h('span', {style: {position: 'fixed', padding: '12px 10px', top: '0', right: '40px', border: '2px solid #333', borderTop: 'none', background: '#444', color: 'white', opacity: '0.8', cursor: 'pointer'}, on: {click: [FULL_SCREEN_CLICKED, false]}}, 'exit full screen'):
                    h('span'),
                h('div', {style: {overflow: 'auto', width: '100%', height: '100%'}}, [app.vdom])
            ])
        ])
        const mainRowComponent = h('div', {
            style: {
                display: 'flex',
                flex: '1',
                position: 'relative',
            },
        }, [
            renderViewComponent,
            rightComponent,
            state.selectedViewNode.ref ? generateEditNodeComponent(): h('span')
        ])
        const vnode = h('div', {
            style: {
            },
        }, [
            topComponent,
            mainRowComponent,
            state.draggedComponentView ? h('div', {style: {pointerEvents: 'none', position: 'fixed', top: state.mousePosition.y + 'px', left: state.mousePosition.x + 'px', lineHeight: '1.2em', zIndex: '99999', width: state.editorRightWidth + 'px'}}, [h('div', {style: {overflow: 'auto', position: 'relative', flex: '1'}}, [fakeComponent(state.draggedComponentView, state.hoveredViewNode ? state.hoveredViewNode.depth : state.draggedComponentView.depth)])]): h('span'),
            state.draggedComponentStateId ? h('div', {style: {pointerEvents: 'none', position: 'fixed', top: state.mousePosition.y + 'px', left: state.mousePosition.x + 'px', lineHeight: '1.2em', zIndex: '99999', width: state.editorRightWidth + 'px'}}, state.hoveredEvent || state.hoveredPipe ? [h('span', {style: {color: '#5bcc5b', position: 'absolute', top: '0', left: '-20px'}},[addCircleIcon()]), fakeState(state.draggedComponentStateId)]: [fakeState(state.draggedComponentStateId)]): h('span'),
        ])

        node = patch(node, vnode)
        currentAnimationFrameRequest = null;
    }

    render()
}