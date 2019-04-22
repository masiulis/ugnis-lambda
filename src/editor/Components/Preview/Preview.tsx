import * as React from 'react'
import styled from 'styled-components'
import state from '@state'
import AddComponentMenu from './AddComponentMenu/AddComponentMenu'
import Component from '@src/editor/Nodes/_Component'
import { connect } from 'lape'
import AddingAtom from '@src/editor/Components/Preview/AddingAtom'
import { getCurrentComponent } from '@src/selectors'
import AddComponent from '@src/editor/TopBar/AddComponent'
import GridOverlay from '@src/editor/Overlay/Grid'

const Wrapper = styled.div`
  position: relative;
  display: grid;
  flex: 1;
  justify-content: center;
  background: radial-gradient(#f7f7f7 15%, transparent 16%) 0 0, radial-gradient(#ececec 15%, transparent 16%) 8px 8px,
    radial-gradient(rgba(255, 255, 255, 0.1) 15%, transparent 20%) 0 1px,
    radial-gradient(rgba(255, 255, 255, 0.1) 15%, transparent 20%) 8px 9px;
  background-color: rgb(0, 0, 0, 0.01);
  background-size: 16px 16px;
  transform: translateZ(0);
`

const PerspectiveBox = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 200px 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr;
  grid-gap: 16px;
  width: 512px;
  align-items: stretch;
  transition: transform 0.25s;
`

const AlignCenter = styled.div`
  position: relative;
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  align-self: center;
`

const GridOverlayWrapper = styled.div`
  position: absolute;
  left: -70px;
  top: -70px;
  width: calc(100% + 70px);
  height: calc(100% + 70px);
  background: rgba(0, 0, 0, 0.15);
`

const unselectComponent = e => {
  if (e.currentTarget === e.target) {
    state.ui.selectedNode = null
    state.ui.stateManager = null
    state.ui.editingTextNode = null
    state.ui.editingBoxNode = null
    state.ui.showAddComponentMenu = false
  }
}

const Preview = () => {
  const component = getCurrentComponent()
  return (
    <Wrapper onClick={unselectComponent}>
      <PerspectiveBox onClick={unselectComponent}>
        <AlignCenter>
          <GridOverlayWrapper>
            <GridOverlay component={component.root} />
          </GridOverlayWrapper>
          <Component component={component.root} parent={null} />
        </AlignCenter>
      </PerspectiveBox>
      <AddComponent />
      {state.ui.showAddComponentMenu && <AddComponentMenu />}
      {state.ui.addingAtom && <AddingAtom />}
    </Wrapper>
  )
}

export default connect(Preview)
