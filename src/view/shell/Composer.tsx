import React, {useLayoutEffect, useState} from 'react'
import {Modal, View} from 'react-native'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {RootSiblingParent} from 'react-native-root-siblings'
import {StatusBar} from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import {observer} from 'mobx-react-lite'

import {isIOS} from '#/platform/detection'
import {Provider as LegacyModalProvider} from '#/state/modals'
import {useComposerState} from '#/state/shell/composer'
import {ModalsContainer as LegacyModalsContainer} from '#/view/com/modals/Modal'
import {atoms as a, useTheme} from '#/alf'
import {getBackgroundColor, useThemeName} from '#/alf/util/useColorModeTheme'
import {
  Outlet as PortalOutlet,
  Provider as PortalProvider,
} from '#/components/Portal'
import {ComposePost, useComposerCancelRef} from '../com/composer/Composer'

export const Composer = observer(function ComposerImpl({}: {
  winHeight: number
}) {
  const t = useTheme()
  const state = useComposerState()
  const ref = useComposerCancelRef()
  const [isModalReady, setIsModalReady] = useState(false)

  const open = !!state
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setIsModalReady(false)
    }
  }

  return (
    <Modal
      aria-modal
      accessibilityViewIsModal
      visible={open}
      presentationStyle="formSheet"
      animationType="slide"
      onShow={() => setIsModalReady(true)}
      onRequestClose={() => ref.current?.onPressCancel()}>
      <View style={[t.atoms.bg, a.flex_1]}>
        <Providers open={open}>
          <ComposePost
            isModalReady={isModalReady}
            cancelRef={ref}
            replyTo={state?.replyTo}
            onPost={state?.onPost}
            quote={state?.quote}
            mention={state?.mention}
            text={state?.text}
            imageUris={state?.imageUris}
          />
        </Providers>
      </View>
    </Modal>
  )
})

function Providers({
  children,
  open,
}: {
  children: React.ReactNode
  open: boolean
}) {
  // on iOS, it's a native formSheet. We use FullWindowOverlay to make
  // the dialogs appear over it
  if (isIOS) {
    return (
      <>
        {children}
        <IOSModalBackground active={open} />
      </>
    )
  } else {
    // on Android we just nest the dialogs within it
    return (
      <GestureHandlerRootView style={a.flex_1}>
        <RootSiblingParent>
          <LegacyModalProvider>
            <PortalProvider>
              {children}
              <LegacyModalsContainer />
              <PortalOutlet />
            </PortalProvider>
          </LegacyModalProvider>
        </RootSiblingParent>
      </GestureHandlerRootView>
    )
  }
}

// Generally, the backdrop of the app is the theme color, but when this is open
// we want it to be black due to the modal being a form sheet.
function IOSModalBackground({active}: {active: boolean}) {
  const theme = useThemeName()

  useLayoutEffect(() => {
    SystemUI.setBackgroundColorAsync('black')

    return () => {
      SystemUI.setBackgroundColorAsync(getBackgroundColor(theme))
    }
  }, [theme])

  // Set the status bar to light - however, only if the modal is active
  // If we rely on this component being mounted to set this,
  // there'll be a delay before it switches back to default.
  return active ? <StatusBar style="light" animated /> : null
}
