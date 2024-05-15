import 'lib/sentry' // must be near top
import 'view/icons'

import React, {useEffect, useState} from 'react'
import {RootSiblingParent} from 'react-native-root-siblings'
import {SafeAreaProvider} from 'react-native-safe-area-context'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {Provider as StatsigProvider} from '#/lib/statsig/statsig'
import {logger} from '#/logger'
import {MessagesProvider} from '#/state/messages'
import {init as initPersistedState} from '#/state/persisted'
import {Provider as LabelDefsProvider} from '#/state/preferences/label-defs'
import {Provider as ModerationOptsProvider} from '#/state/preferences/moderation-opts'
import {readLastActiveAccount} from '#/state/session/util'
import {useIntentHandler} from 'lib/hooks/useIntentHandler'
import {QueryProvider} from 'lib/react-query'
import {ThemeProvider} from 'lib/ThemeContext'
import {Provider as DialogStateProvider} from 'state/dialogs'
import {Provider as InvitesStateProvider} from 'state/invites'
import {Provider as LightboxStateProvider} from 'state/lightbox'
import {Provider as ModalStateProvider} from 'state/modals'
import {Provider as MutedThreadsProvider} from 'state/muted-threads'
import {Provider as PrefsStateProvider} from 'state/preferences'
import {Provider as UnreadNotifsProvider} from 'state/queries/notifications/unread'
import {
  Provider as SessionProvider,
  SessionAccount,
  useSession,
  useSessionApi,
} from 'state/session'
import {Provider as ShellStateProvider} from 'state/shell'
import {Provider as LoggedOutViewProvider} from 'state/shell/logged-out'
import {Provider as SelectedFeedProvider} from 'state/shell/selected-feed'
import * as Toast from 'view/com/util/Toast'
import {ToastContainer} from 'view/com/util/Toast.web'
import {Shell} from 'view/shell/index'
import {ThemeProvider as Alf} from '#/alf'
import {useColorModeTheme} from '#/alf/util/useColorModeTheme'
import {Provider as PortalProvider} from '#/components/Portal'
import {BackgroundNotificationPreferencesProvider} from '../modules/expo-background-notification-handler/src/BackgroundNotificationHandlerProvider'
import I18nProvider from './locale/i18nProvider'
import {listenSessionDropped} from './state/events'

function InnerApp() {
  const [isReady, setIsReady] = React.useState(false)
  const {currentAccount} = useSession()
  const {resumeSession} = useSessionApi()
  const theme = useColorModeTheme()
  const {_} = useLingui()
  useIntentHandler()

  // init
  useEffect(() => {
    async function onLaunch(account?: SessionAccount) {
      try {
        if (account) {
          await resumeSession(account)
        }
      } catch (e) {
        logger.error(`session: resumeSession failed`, {message: e})
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

  // wait for session to resume
  if (!isReady) return null

  return (
    <Alf theme={theme}>
      <ThemeProvider theme={theme}>
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
                              <SafeAreaProvider>
                                <Shell />
                              </SafeAreaProvider>
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
          <ToastContainer />
        </RootSiblingParent>
      </ThemeProvider>
    </Alf>
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
    <SessionProvider>
      <ShellStateProvider>
        <PrefsStateProvider>
          <MutedThreadsProvider>
            <InvitesStateProvider>
              <ModalStateProvider>
                <DialogStateProvider>
                  <LightboxStateProvider>
                    <I18nProvider>
                      <PortalProvider>
                        <InnerApp />
                      </PortalProvider>
                    </I18nProvider>
                  </LightboxStateProvider>
                </DialogStateProvider>
              </ModalStateProvider>
            </InvitesStateProvider>
          </MutedThreadsProvider>
        </PrefsStateProvider>
      </ShellStateProvider>
    </SessionProvider>
  )
}

export default App
