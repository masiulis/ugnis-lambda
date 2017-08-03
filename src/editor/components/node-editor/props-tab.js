import h from 'snabbdom/h'
import {state} from '../../state'
import {
    CHANGE_COMPONENT_PATH,
} from '../../events'
import emberEditor from '../ember'

export default () =>{
    const selectedNode = state.definitionList[state.currentDefinitionId][state.selectedViewNode.ref][state.selectedViewNode.id]

    return  h('div', [
        (() => {
            if (state.selectedViewNode.id === '_rootNode') {
                const inputStyle = {
                    color: 'white',
                    background: 'none',
                    outline: 'none',
                    border: 'none',
                    boxShadow: 'inset 0 -2px 0 0 #ccc',
                }
                return h(
                    'div',
                    {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '10px 20px',
                        },
                    },
                    [
                        h(
                            'div',
                            {
                                style: {
                                    padding: '20px 20px 0 0',
                                    fontSize: '12px',
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    color: '#8e8e8e',
                                },
                            },
                            'react path'
                        ),
                        h('input', {
                            style: inputStyle,
                            on: {
                                input: [CHANGE_COMPONENT_PATH, 'reactPath'],
                            },
                            liveProps: {
                                value: state.definitionList[state.currentDefinitionId]['reactPath'],
                            },
                        }),
                        h(
                            'div',
                            {
                                style: {
                                    padding: '20px 20px 0 0',
                                    fontSize: '12px',
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    color: '#8e8e8e',
                                },
                            },
                            'react native path'
                        ),
                        h('input', {
                            style: inputStyle,
                            on: {
                                input: [CHANGE_COMPONENT_PATH, 'reactNativePath'],
                            },
                            liveProps: {
                                value: state.definitionList[state.currentDefinitionId]['reactNativePath'],
                            },
                        }),
                    ]
                )
            }
            if (state.selectedViewNode.ref === 'vNodeBox') {
                return h(
                    'div',
                    {
                        style: {
                            textAlign: 'center',
                            marginTop: '100px',
                            color: '#bdbdbd',
                        },
                    },
                    'no data required'
                )
            }
            if (state.selectedViewNode.ref === 'vNodeText') {
                return h(
                    'div',
                    {
                        style: {overflow: 'auto'},
                        attrs: {class: 'better-scrollbar'},
                    },
                    [
                        h(
                            'div',
                            {
                                style: {
                                    padding: '20px 20px 5px 20px',
                                    fontSize: '12px',
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    color: '#8e8e8e',
                                },
                            },
                            'text'
                        ),
                        h('div', {style: {padding: '0 20px'}}, [emberEditor(selectedNode.value, 'text')]),
                    ]
                )
            }
            if (state.selectedViewNode.ref === 'vNodeImage') {
                return h(
                    'div',
                    {
                        style: {overflow: 'auto'},
                        attrs: {class: 'better-scrollbar'},
                    },
                    [
                        h(
                            'div',
                            {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#676767',
                                    padding: '5px 10px',
                                    marginBottom: '10px',
                                },
                            },
                            [
                                h('span', {style: {flex: '1'}}, 'source (url)'),
                                h(
                                    'div',
                                    {
                                        style: {
                                            flex: '0',
                                            cursor: 'default',
                                            color: '#bdbdbd',
                                        },
                                    },
                                    'text'
                                ),
                            ]
                        ),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.src, 'text')]),
                    ]
                )
            }
            if (state.selectedViewNode.ref === 'vNodeInput') {
                return h(
                    'div',
                    {
                        style: {overflow: 'auto'},
                        attrs: {class: 'better-scrollbar'},
                    },
                    [
                        h(
                            'div',
                            {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#676767',
                                    padding: '5px 10px',
                                    marginBottom: '10px',
                                },
                            },
                            [
                                h('span', {style: {flex: '1'}}, 'input value'),
                                h(
                                    'div',
                                    {
                                        style: {
                                            flex: '0',
                                            cursor: 'default',
                                            color: '#bdbdbd',
                                        },
                                    },
                                    'text'
                                ),
                            ]
                        ),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.value, 'text')]),
                    ]
                )
            }
            if (state.selectedViewNode.ref === 'vNodeList') {
                return h(
                    'div',
                    {
                        style: {overflow: 'auto'},
                        attrs: {class: 'better-scrollbar'},
                    },
                    [
                        h(
                            'div',
                            {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#676767',
                                    padding: '5px 10px',
                                    marginBottom: '10px',
                                },
                            },
                            [
                                h('span', {style: {flex: '1'}}, 'table'),
                                h(
                                    'div',
                                    {
                                        style: {
                                            flex: '0',
                                            cursor: 'default',
                                            color: '#bdbdbd',
                                        },
                                    },
                                    'table'
                                ),
                            ]
                        ),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.value, 'table')]),
                    ]
                )
            }
            if (state.selectedViewNode.ref === 'vNodeIf') {
                return h(
                    'div',
                    {
                        style: {overflow: 'auto'},
                        attrs: {class: 'better-scrollbar'},
                    },
                    [
                        h(
                            'div',
                            {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#676767',
                                    padding: '5px 10px',
                                    marginBottom: '10px',
                                },
                            },
                            [
                                h('span', {style: {flex: '1'}}, 'predicate'),
                                h(
                                    'div',
                                    {
                                        style: {
                                            flex: '0',
                                            cursor: 'default',
                                            color: '#bdbdbd',
                                        },
                                    },
                                    'true/false'
                                ),
                            ]
                        ),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.value, 'boolean')]),
                    ]
                )
            }
            if (state.selectedViewNode.ref === 'vNodeList') {
                return h(
                    'div',
                    {
                        style: {overflow: 'auto'},
                        attrs: {class: 'better-scrollbar'},
                    },
                    [
                        h(
                            'div',
                            {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#676767',
                                    padding: '5px 10px',
                                    marginBottom: '10px',
                                },
                            },
                            [
                                h('span', {style: {flex: '1'}}, 'predicate'),
                                h(
                                    'div',
                                    {
                                        style: {
                                            flex: '0',
                                            cursor: 'default',
                                            color: '#bdbdbd',
                                        },
                                    },
                                    'true/false'
                                ),
                            ]
                        ),
                        h('div', {style: {padding: '5px 10px'}}, [emberEditor(selectedNode.value, 'table')]),
                    ]
                )
            }
        })(),
    ])
}
   