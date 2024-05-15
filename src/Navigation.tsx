import * as React from 'react'
import {JSX} from 'react/jsx-runtime'
import {i18n, MessageDescriptor} from '@lingui/core'
import {msg} from '@lingui/macro'
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import {
  CommonActions,
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  StackActions,
} from '@react-navigation/native'

import {timeout} from 'lib/async/timeout'
import {useColorSchemeStyle} from 'lib/hooks/useColorSchemeStyle'
import {usePalette} from 'lib/hooks/usePalette'
import {buildStateObject} from 'lib/routes/helpers'
import {
  AllNavigatorParams,
  BottomTabNavigatorParams,
  FeedsTabNavigatorParams,
  FlatNavigatorParams,
  HomeTabNavigatorParams,
  MessagesTabNavigatorParams,
  MyProfileTabNavigatorParams,
  NotificationsTabNavigatorParams,
  SearchTabNavigatorParams,
} from 'lib/routes/types'
import {RouteParams, State} from 'lib/routes/types'
import {bskyTitle} from 'lib/strings/headings'
import {isAndroid, isNative} from 'platform/detection'
import {PreferencesExternalEmbeds} from '#/view/screens/PreferencesExternalEmbeds'
import {AppPasswords} from 'view/screens/AppPasswords'
import {ModerationBlockedAccounts} from 'view/screens/ModerationBlockedAccounts'
import {ModerationMutedAccounts} from 'view/screens/ModerationMutedAccounts'
import {PreferencesFollowingFeed} from 'view/screens/PreferencesFollowingFeed'
import {PreferencesThreads} from 'view/screens/PreferencesThreads'
import {SavedFeeds} from 'view/screens/SavedFeeds'
import HashtagScreen from '#/screens/Hashtag'
import {ModerationScreen} from '#/screens/Moderation'
import {ProfileLabelerLikedByScreen} from '#/screens/Profile/ProfileLabelerLikedBy'
import {init as initAnalytics} from './lib/analytics/analytics'
import {useWebScrollRestoration} from './lib/hooks/useWebScrollRestoration'
import {attachRouteToLogEvents, logEvent} from './lib/statsig/statsig'
import {router} from './routes'
import {MessagesConversationScreen} from './screens/Messages/Conversation'
import {MessagesScreen} from './screens/Messages/List'
import {MessagesSettingsScreen} from './screens/Messages/Settings'
import {useModalControls} from './state/modals'
import {useUnreadNotifications} from './state/queries/notifications/unread'
import {useSession} from './state/session'
import {
  setEmailConfirmationRequested,
  shouldRequestEmailConfirmation,
} from './state/shell/reminders'
import {AccessibilitySettingsScreen} from './view/screens/AccessibilitySettings'
import {CommunityGuidelinesScreen} from './view/screens/CommunityGuidelines'
import {CopyrightPolicyScreen} from './view/screens/CopyrightPolicy'
import {DebugModScreen} from './view/screens/DebugMod'
import {FeedsScreen} from './view/screens/Feeds'
import {HomeScreen} from './view/screens/Home'
import {LanguageSettingsScreen} from './view/screens/LanguageSettings'
import {ListsScreen} from './view/screens/Lists'
import {LogScreen} from './view/screens/Log'
import {ModerationModlistsScreen} from './view/screens/ModerationModlists'
import {NotFoundScreen} from './view/screens/NotFound'
import {NotificationsScreen} from './view/screens/Notifications'
import {PostLikedByScreen} from './view/screens/PostLikedBy'
import {PostRepostedByScreen} from './view/screens/PostRepostedBy'
import {PostThreadScreen} from './view/screens/PostThread'
import {PrivacyPolicyScreen} from './view/screens/PrivacyPolicy'
import {ProfileScreen} from './view/screens/Profile'
import {ProfileFeedScreen} from './view/screens/ProfileFeed'
import {ProfileFeedLikedByScreen} from './view/screens/ProfileFeedLikedBy'
import {ProfileFollowersScreen} from './view/screens/ProfileFollowers'
import {ProfileFollowsScreen} from './view/screens/ProfileFollows'
import {ProfileListScreen} from './view/screens/ProfileList'
import {SearchScreen} from './view/screens/Search'
import {SettingsScreen} from './view/screens/Settings'
import {Storybook} from './view/screens/Storybook'
import {SupportScreen} from './view/screens/Support'
import {TermsOfServiceScreen} from './view/screens/TermsOfService'
import {BottomBar} from './view/shell/bottom-bar/BottomBar'
import {createNativeStackNavigatorWithAuth} from './view/shell/createNativeStackNavigatorWithAuth'

const navigationRef = createNavigationContainerRef<AllNavigatorParams>()

const HomeTab = createNativeStackNavigatorWithAuth<HomeTabNavigatorParams>()
const SearchTab = createNativeStackNavigatorWithAuth<SearchTabNavigatorParams>()
const FeedsTab = createNativeStackNavigatorWithAuth<FeedsTabNavigatorParams>()
const NotificationsTab =
  createNativeStackNavigatorWithAuth<NotificationsTabNavigatorParams>()
const MyProfileTab =
  createNativeStackNavigatorWithAuth<MyProfileTabNavigatorParams>()
const MessagesTab =
  createNativeStackNavigatorWithAuth<MessagesTabNavigatorParams>()
const Flat = createNativeStackNavigatorWithAuth<FlatNavigatorParams>()
const Tab = createBottomTabNavigator<BottomTabNavigatorParams>()

/**
 * These "common screens" are reused across stacks.
 */
function commonScreens(Stack: typeof HomeTab, unreadCountLabel?: string) {
  const title = (page: MessageDescriptor) =>
    bskyTitle(i18n._(page), unreadCountLabel)

  return (
    <>
      <Stack.Screen
        name="NotFound"
        getComponent={() => NotFoundScreen}
        options={{title: title(msg`Not Found`)}}
      />
      <Stack.Screen
        name="Lists"
        component={ListsScreen}
        options={{title: title(msg`Lists`), requireAuth: true}}
      />
      <Stack.Screen
        name="Moderation"
        getComponent={() => ModerationScreen}
        options={{title: title(msg`Moderation`), requireAuth: true}}
      />
      <Stack.Screen
        name="ModerationModlists"
        getComponent={() => ModerationModlistsScreen}
        options={{title: title(msg`Moderation Lists`), requireAuth: true}}
      />
      <Stack.Screen
        name="ModerationMutedAccounts"
        getComponent={() => ModerationMutedAccounts}
        options={{title: title(msg`Muted Accounts`), requireAuth: true}}
      />
      <Stack.Screen
        name="ModerationBlockedAccounts"
        getComponent={() => ModerationBlockedAccounts}
        options={{title: title(msg`Blocked Accounts`), requireAuth: true}}
      />
      <Stack.Screen
        name="Settings"
        getComponent={() => SettingsScreen}
        options={{title: title(msg`Settings`), requireAuth: true}}
      />
      <Stack.Screen
        name="LanguageSettings"
        getComponent={() => LanguageSettingsScreen}
        options={{title: title(msg`Language Settings`), requireAuth: true}}
      />
      <Stack.Screen
        name="Profile"
        getComponent={() => ProfileScreen}
        options={({route}) => ({
          title: bskyTitle(`@${route.params.name}`, unreadCountLabel),
        })}
      />
      <Stack.Screen
        name="ProfileFollowers"
        getComponent={() => ProfileFollowersScreen}
        options={({route}) => ({
          title: title(msg`People following @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="ProfileFollows"
        getComponent={() => ProfileFollowsScreen}
        options={({route}) => ({
          title: title(msg`People followed by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="ProfileList"
        getComponent={() => ProfileListScreen}
        options={{title: title(msg`List`), requireAuth: true}}
      />
      <Stack.Screen
        name="PostThread"
        getComponent={() => PostThreadScreen}
        options={({route}) => ({
          title: title(msg`Post by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="PostLikedBy"
        getComponent={() => PostLikedByScreen}
        options={({route}) => ({
          title: title(msg`Post by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="PostRepostedBy"
        getComponent={() => PostRepostedByScreen}
        options={({route}) => ({
          title: title(msg`Post by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="ProfileFeed"
        getComponent={() => ProfileFeedScreen}
        options={{title: title(msg`Feed`)}}
      />
      <Stack.Screen
        name="ProfileFeedLikedBy"
        getComponent={() => ProfileFeedLikedByScreen}
        options={{title: title(msg`Liked by`)}}
      />
      <Stack.Screen
        name="ProfileLabelerLikedBy"
        getComponent={() => ProfileLabelerLikedByScreen}
        options={{title: title(msg`Liked by`)}}
      />
      <Stack.Screen
        name="Debug"
        getComponent={() => Storybook}
        options={{title: title(msg`Storybook`), requireAuth: true}}
      />
      <Stack.Screen
        name="DebugMod"
        getComponent={() => DebugModScreen}
        options={{title: title(msg`Moderation states`), requireAuth: true}}
      />
      <Stack.Screen
        name="Log"
        getComponent={() => LogScreen}
        options={{title: title(msg`Log`), requireAuth: true}}
      />
      <Stack.Screen
        name="Support"
        getComponent={() => SupportScreen}
        options={{title: title(msg`Support`)}}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        getComponent={() => PrivacyPolicyScreen}
        options={{title: title(msg`Privacy Policy`)}}
      />
      <Stack.Screen
        name="TermsOfService"
        getComponent={() => TermsOfServiceScreen}
        options={{title: title(msg`Terms of Service`)}}
      />
      <Stack.Screen
        name="CommunityGuidelines"
        getComponent={() => CommunityGuidelinesScreen}
        options={{title: title(msg`Community Guidelines`)}}
      />
      <Stack.Screen
        name="CopyrightPolicy"
        getComponent={() => CopyrightPolicyScreen}
        options={{title: title(msg`Copyright Policy`)}}
      />
      <Stack.Screen
        name="AppPasswords"
        getComponent={() => AppPasswords}
        options={{title: title(msg`App Passwords`), requireAuth: true}}
      />
      <Stack.Screen
        name="SavedFeeds"
        getComponent={() => SavedFeeds}
        options={{title: title(msg`Edit My Feeds`), requireAuth: true}}
      />
      <Stack.Screen
        name="PreferencesFollowingFeed"
        getComponent={() => PreferencesFollowingFeed}
        options={{
          title: title(msg`Following Feed Preferences`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="PreferencesThreads"
        getComponent={() => PreferencesThreads}
        options={{title: title(msg`Threads Preferences`), requireAuth: true}}
      />
      <Stack.Screen
        name="PreferencesExternalEmbeds"
        getComponent={() => PreferencesExternalEmbeds}
        options={{
          title: title(msg`External Media Preferences`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="AccessibilitySettings"
        getComponent={() => AccessibilitySettingsScreen}
        options={{
          title: title(msg`Accessibility Settings`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="Hashtag"
        getComponent={() => HashtagScreen}
        options={{title: title(msg`Hashtag`)}}
      />
      <Stack.Screen
        name="MessagesConversation"
        getComponent={() => MessagesConversationScreen}
        options={{title: title(msg`Chat`), requireAuth: true}}
      />
      <Stack.Screen
        name="MessagesSettings"
        getComponent={() => MessagesSettingsScreen}
        options={{title: title(msg`Chat settings`), requireAuth: true}}
      />
    </>
  )
}

/**
 * The TabsNavigator is used by native mobile to represent the routes
 * in 3 distinct tab-stacks with a different root screen on each.
 */
function TabsNavigator() {
  const tabBar = React.useCallback(
    (props: JSX.IntrinsicAttributes & BottomTabBarProps) => (
      <BottomBar {...props} />
    ),
    [],
  )

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      backBehavior="initialRoute"
      screenOptions={{headerShown: false, lazy: true}}
      tabBar={tabBar}>
      <Tab.Screen name="HomeTab" getComponent={() => HomeTabNavigator} />
      <Tab.Screen name="SearchTab" getComponent={() => SearchTabNavigator} />
      <Tab.Screen name="FeedsTab" getComponent={() => FeedsTabNavigator} />
      <Tab.Screen
        name="NotificationsTab"
        getComponent={() => NotificationsTabNavigator}
      />
      <Tab.Screen
        name="MyProfileTab"
        getComponent={() => MyProfileTabNavigator}
      />
      <Tab.Screen
        name="MessagesTab"
        getComponent={() => MessagesTabNavigator}
      />
    </Tab.Navigator>
  )
}

function HomeTabNavigator() {
  const pal = usePalette('default')

  return (
    <HomeTab.Navigator
      screenOptions={{
        animation: isAndroid ? 'none' : undefined,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        headerShown: false,
        animationDuration: 250,
        contentStyle: pal.view,
      }}>
      <HomeTab.Screen name="Home" getComponent={() => HomeScreen} />
      {commonScreens(HomeTab)}
    </HomeTab.Navigator>
  )
}

function SearchTabNavigator() {
  const pal = usePalette('default')
  return (
    <SearchTab.Navigator
      screenOptions={{
        animation: isAndroid ? 'none' : undefined,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        headerShown: false,
        animationDuration: 250,
        contentStyle: pal.view,
      }}>
      <SearchTab.Screen name="Search" getComponent={() => SearchScreen} />
      {commonScreens(SearchTab as typeof HomeTab)}
    </SearchTab.Navigator>
  )
}

function FeedsTabNavigator() {
  const pal = usePalette('default')
  return (
    <FeedsTab.Navigator
      screenOptions={{
        animation: isAndroid ? 'none' : undefined,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        headerShown: false,
        animationDuration: 250,
        contentStyle: pal.view,
      }}>
      <FeedsTab.Screen name="Feeds" getComponent={() => FeedsScreen} />
      {commonScreens(FeedsTab as typeof HomeTab)}
    </FeedsTab.Navigator>
  )
}

function NotificationsTabNavigator() {
  const pal = usePalette('default')
  return (
    <NotificationsTab.Navigator
      screenOptions={{
        animation: isAndroid ? 'none' : undefined,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        headerShown: false,
        animationDuration: 250,
        contentStyle: pal.view,
      }}>
      <NotificationsTab.Screen
        name="Notifications"
        getComponent={() => NotificationsScreen}
        options={{requireAuth: true}}
      />
      {commonScreens(NotificationsTab as typeof HomeTab)}
    </NotificationsTab.Navigator>
  )
}

function MyProfileTabNavigator() {
  const pal = usePalette('default')
  return (
    <MyProfileTab.Navigator
      screenOptions={{
        animation: isAndroid ? 'none' : undefined,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        headerShown: false,
        animationDuration: 250,
        contentStyle: pal.view,
      }}>
      <MyProfileTab.Screen
        // @ts-ignore // TODO: fix this broken type in ProfileScreen
        name="MyProfile"
        getComponent={() => ProfileScreen}
        initialParams={{
          name: 'me',
        }}
      />
      {commonScreens(MyProfileTab as typeof HomeTab)}
    </MyProfileTab.Navigator>
  )
}

function MessagesTabNavigator() {
  const pal = usePalette('default')
  return (
    <MessagesTab.Navigator
      screenOptions={{
        animation: isAndroid ? 'none' : undefined,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        headerShown: false,
        animationDuration: 250,
        contentStyle: pal.view,
      }}>
      <MessagesTab.Screen
        name="Messages"
        getComponent={() => MessagesScreen}
        options={{requireAuth: true}}
      />
      {commonScreens(MessagesTab as typeof HomeTab)}
    </MessagesTab.Navigator>
  )
}

/**
 * The FlatNavigator is used by Web to represent the routes
 * in a single ("flat") stack.
 */
const FlatNavigator = () => {
  const pal = usePalette('default')
  const numUnread = useUnreadNotifications()
  const screenListeners = useWebScrollRestoration()
  const title = (page: MessageDescriptor) => bskyTitle(i18n._(page), numUnread)

  return (
    <Flat.Navigator
      screenListeners={screenListeners}
      screenOptions={{
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        headerShown: false,
        animationDuration: 250,
        contentStyle: pal.view,
      }}>
      <Flat.Screen
        name="Home"
        getComponent={() => HomeScreen}
        options={{title: title(msg`Home`)}}
      />
      <Flat.Screen
        name="Search"
        getComponent={() => SearchScreen}
        options={{title: title(msg`Search`)}}
      />
      <Flat.Screen
        name="Feeds"
        getComponent={() => FeedsScreen}
        options={{title: title(msg`Feeds`)}}
      />
      <Flat.Screen
        name="Notifications"
        getComponent={() => NotificationsScreen}
        options={{title: title(msg`Notifications`), requireAuth: true}}
      />
      <Flat.Screen
        name="Messages"
        getComponent={() => MessagesScreen}
        options={{title: title(msg`Messages`), requireAuth: true}}
      />
      {commonScreens(Flat as typeof HomeTab, numUnread)}
    </Flat.Navigator>
  )
}

/**
 * The RoutesContainer should wrap all components which need access
 * to the navigation context.
 */

const LINKING = {
  // TODO figure out what we are going to use
  prefixes: ['bsky://', 'bluesky://', 'https://bsky.app'],

  getPathFromState(state: State) {
    // find the current node in the navigation tree
    let node = state.routes[state.index || 0]
    while (node.state?.routes && typeof node.state?.index === 'number') {
      node = node.state?.routes[node.state?.index]
    }

    // build the path
    const route = router.matchName(node.name)
    if (typeof route === 'undefined') {
      return '/' // default to home
    }
    return route.build((node.params || {}) as RouteParams)
  },

  getStateFromPath(path: string) {
    const [name, params] = router.matchPath(path)

    // Any time we receive a url that starts with `intent/` we want to ignore it here. It will be handled in the
    // intent handler hook. We should check for the trailing slash, because if there isn't one then it isn't a valid
    // intent
    // On web, there is no route state that's created by default, so we should initialize it as the home route. On
    // native, since the home tab and the home screen are defined as initial routes, we don't need to return a state
    // since it will be created by react-navigation.
    if (path.includes('intent/')) {
      if (isNative) return
      return buildStateObject('Flat', 'Home', params)
    }

    if (isNative) {
      if (name === 'Search') {
        return buildStateObject('SearchTab', 'Search', params)
      }
      if (name === 'Notifications') {
        return buildStateObject('NotificationsTab', 'Notifications', params)
      }
      if (name === 'Home') {
        return buildStateObject('HomeTab', 'Home', params)
      }
      if (name === 'Messages') {
        return buildStateObject('MessagesTab', 'Messages', params)
      }
      // if the path is something else, like a post, profile, or even settings, we need to initialize the home tab as pre-existing state otherwise the back button will not work
      return buildStateObject('HomeTab', name, params, [
        {
          name: 'Home',
          params: {},
        },
      ])
    } else {
      const res = buildStateObject('Flat', name, params)
      return res
    }
  },
}

function RoutesContainer({children}: React.PropsWithChildren<{}>) {
  const theme = useColorSchemeStyle(DefaultTheme, DarkTheme)
  const {currentAccount} = useSession()
  const {openModal} = useModalControls()
  const prevLoggedRouteName = React.useRef<string | undefined>(undefined)

  function onReady() {
    prevLoggedRouteName.current = getCurrentRouteName()
    initAnalytics(currentAccount)

    if (currentAccount && shouldRequestEmailConfirmation(currentAccount)) {
      openModal({name: 'verify-email', showReminder: true})
      setEmailConfirmationRequested()
    }
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={LINKING}
      theme={theme}
      onStateChange={() => {
        logEvent('router:navigate', {
          from: prevLoggedRouteName.current,
        })
        prevLoggedRouteName.current = getCurrentRouteName()
      }}
      onReady={() => {
        attachRouteToLogEvents(getCurrentRouteName)
        logModuleInitTime()
        onReady()
        logEvent('router:navigate', {})
      }}>
      {children}
    </NavigationContainer>
  )
}

function getCurrentRouteName() {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.name
  } else {
    return undefined
  }
}

/**
 * These helpers can be used from outside of the RoutesContainer
 * (eg in the state models).
 */

function navigate<K extends keyof AllNavigatorParams>(
  name: K,
  params?: AllNavigatorParams[K],
) {
  if (navigationRef.isReady()) {
    return Promise.race([
      new Promise<void>(resolve => {
        const handler = () => {
          resolve()
          navigationRef.removeListener('state', handler)
        }
        navigationRef.addListener('state', handler)

        // @ts-ignore I dont know what would make typescript happy but I have a life -prf
        navigationRef.navigate(name, params)
      }),
      timeout(1e3),
    ])
  }
  return Promise.resolve()
}

function resetToTab(tabName: 'HomeTab' | 'SearchTab' | 'NotificationsTab') {
  if (navigationRef.isReady()) {
    navigate(tabName)
    if (navigationRef.canGoBack()) {
      navigationRef.dispatch(StackActions.popToTop()) //we need to check .canGoBack() before calling it
    }
  }
}

// returns a promise that resolves after the state reset is complete
function reset(): Promise<void> {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: isNative ? 'HomeTab' : 'Home'}],
      }),
    )
    return Promise.race([
      timeout(1e3),
      new Promise<void>(resolve => {
        const handler = () => {
          resolve()
          navigationRef.removeListener('state', handler)
        }
        navigationRef.addListener('state', handler)
      }),
    ])
  } else {
    return Promise.resolve()
  }
}

function handleLink(url: string) {
  let path
  if (url.startsWith('/')) {
    path = url
  } else if (url.startsWith('http')) {
    try {
      path = new URL(url).pathname
    } catch (e) {
      console.error('Invalid url', url, e)
      return
    }
  } else {
    console.error('Invalid url', url)
    return
  }

  const [name, params] = router.matchPath(path)
  if (isNative) {
    if (name === 'Search') {
      resetToTab('SearchTab')
    } else if (name === 'Notifications') {
      resetToTab('NotificationsTab')
    } else {
      resetToTab('HomeTab')
      // @ts-ignore matchPath doesnt give us type-checked output -prf
      navigate(name, params)
    }
  } else {
    // @ts-ignore matchPath doesnt give us type-checked output -prf
    navigate(name, params)
  }
}

let didInit = false
function logModuleInitTime() {
  if (didInit) {
    return
  }
  didInit = true

  const initMs = Math.round(
    // @ts-ignore Emitted by Metro in the bundle prelude
    performance.now() - global.__BUNDLE_START_TIME__,
  )
  console.log(`Time to first paint: ${initMs} ms`)
  logEvent('init', {
    initMs,
  })

  if (__DEV__) {
    // This log is noisy, so keep false committed
    const shouldLog = false
    // Relies on our patch to polyfill.js in metro-runtime
    const initLogs = (global as any).__INIT_LOGS__
    if (shouldLog && Array.isArray(initLogs)) {
      console.log(initLogs.join('\n'))
    }
  }
}

export {
  FlatNavigator,
  handleLink,
  navigate,
  reset,
  resetToTab,
  RoutesContainer,
  TabsNavigator,
}
