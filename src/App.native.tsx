import 'react-native-url-polyfill/auto'
import 'lib/sentry' // must be near top
import 'view/icons'

import React, {useEffect, useState} from 'react'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {KeyboardProvider} from 'react-native-keyboard-controller'
import {RootSiblingParent} from 'react-native-root-siblings'
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useIntentHandler} from '#/lib/hooks/useIntentHandler'
import {QueryProvider} from '#/lib/react-query'
import {
  initialize,
  Provider as StatsigProvider,
  tryFetchGates,
} from '#/lib/statsig/statsig'
import {s} from '#/lib/styles'
import {ThemeProvider} from '#/lib/ThemeContext'
import {logger} from '#/logger'
import {Provider as A11yProvider} from '#/state/a11y'
import {Provider as MutedThreadsProvider} from '#/state/cache/thread-mutes'
import {Provider as DialogStateProvider} from '#/state/dialogs'
import {Provider as InvitesStateProvider} from '#/state/invites'
import {Provider as LightboxStateProvider} from '#/state/lightbox'
import {MessagesProvider} from '#/state/messages'
import {Provider as ModalStateProvider} from '#/state/modals'
import {init as initPersistedState} from '#/state/persisted'
import {Provider as PrefsStateProvider} from '#/state/preferences'
import {Provider as LabelDefsProvider} from '#/state/preferences/label-defs'
import {Provider as ModerationOptsProvider} from '#/state/preferences/moderation-opts'
import {Provider as UnreadNotifsProvider} from '#/state/queries/notifications/unread'
import {
  Provider as SessionProvider,
  SessionAccount,
  useSession,
  useSessionApi,
} from '#/state/session'
import {readLastActiveAccount} from '#/state/session/util'
import {Provider as ShellStateProvider} from '#/state/shell'
import {Provider as LoggedOutViewProvider} from '#/state/shell/logged-out'
import {Provider as SelectedFeedProvider} from '#/state/shell/selected-feed'
import {Provider as StarterPackProvider} from '#/state/shell/starter-pack'
import {TestCtrls} from '#/view/com/testing/TestCtrls'
import * as Toast from '#/view/com/util/Toast'
import {Shell} from '#/view/shell'
import {ThemeProvider as Alf} from '#/alf'
import {useColorModeTheme} from '#/alf/util/useColorModeTheme'
import {useStarterPackEntry} from '#/components/hooks/useStarterPackEntry'
import {Provider as PortalProvider} from '#/components/Portal'
import {Splash} from '#/Splash'
import {BackgroundNotificationPreferencesProvider} from '../modules/expo-background-notification-handler/src/BackgroundNotificationHandlerProvider'
import I18nProvider from './locale/i18nProvider'
import {listenSessionDropped} from './state/events'

SplashScreen.preventAutoHideAsync()

function InnerApp() {
  const [isReady, setIsReady] = React.useState(false)
  const {currentAccount} = useSession()
  const {resumeSession} = useSessionApi()
  const theme = useColorModeTheme()
  const {_} = useLingui()

  useIntentHandler()
  const hasCheckedReferrer = useStarterPackEntry()

  // init
  useEffect(() => {
    async function onLaunch(account?: SessionAccount) {
      try {
        if (account) {
          await resumeSession(account)
        } else {
          await initialize()
          await tryFetchGates(undefined, 'prefer-fresh-gates')
        }
      } catch (e) {
        logger.error(`session: resume failed`, {message: e})
      } finally {
        setIsReady(true)
      }
    }
    const account = readLastActiveAccount()
    onLaunch(account)
  }, [resumeSession])

  useEffect(() => {
    return listenSessionDropped(() => {
      Toast.show(_(msg`Sorry! Your session expired. Please log in again.`))
    })
  }, [_])

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Alf theme={theme}>
        <ThemeProvider theme={theme}>
          <Splash isReady={isReady && hasCheckedReferrer}>
            <RootSiblingParent>
              <React.Fragment
                // Resets the entire tree below when it changes:
                key={currentAccount?.did}>
                <QueryProvider currentDid={currentAccount?.did}>
                  <StatsigProvider>
                    <MessagesProvider>
                      {/* LabelDefsProvider MUST come before ModerationOptsProvider */}
                      <LabelDefsProvider>
                        <ModerationOptsProvider>
                          <LoggedOutViewProvider>
                            <SelectedFeedProvider>
                              <UnreadNotifsProvider>
                                <BackgroundNotificationPreferencesProvider>
                                  <MutedThreadsProvider>
                                    <GestureHandlerRootView style={s.h100pct}>
                                      <TestCtrls />
                                      <Shell />
                                    </GestureHandlerRootView>
                                  </MutedThreadsProvider>
                                </BackgroundNotificationPreferencesProvider>
                              </UnreadNotifsProvider>
                            </SelectedFeedProvider>
                          </LoggedOutViewProvider>
                        </ModerationOptsProvider>
                      </LabelDefsProvider>
                    </MessagesProvider>
                  </StatsigProvider>
                </QueryProvider>
              </React.Fragment>
            </RootSiblingParent>
          </Splash>
        </ThemeProvider>
      </Alf>
    </SafeAreaProvider>
  )
}

function App() {
  const [isReady, setReady] = useState(false)

  React.useEffect(() => {
    initPersistedState().then(() => setReady(true))
  }, [])

  if (!isReady) {
    return null
  }

  /*
   * NOTE: only nothing here can depend on other data or session state, since
   * that is set up in the InnerApp component above.
   */
  return (
    <A11yProvider>
      <KeyboardProvider enabled={false} statusBarTranslucent={true}>
        <SessionProvider>
          <ShellStateProvider>
            <PrefsStateProvider>
              <InvitesStateProvider>
                <ModalStateProvider>
                  <DialogStateProvider>
                    <LightboxStateProvider>
                      <I18nProvider>
                        <PortalProvider>
                          <StarterPackProvider>
                            <InnerApp />
                          </StarterPackProvider>
                        </PortalProvider>
                      </I18nProvider>
                    </LightboxStateProvider>
                  </DialogStateProvider>
                </ModalStateProvider>
              </InvitesStateProvider>
            </PrefsStateProvider>
          </ShellStateProvider>
        </SessionProvider>
      </KeyboardProvider>
    </A11yProvider>
  )
}

export default App
