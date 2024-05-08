import React from 'react'
import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {
  FontAwesomeIcon,
  FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {
  useLinkProps,
  useNavigation,
  useNavigationState,
} from '@react-navigation/native'

import {useGate} from '#/lib/statsig/statsig'
import {isInvalidHandle} from '#/lib/strings/handles'
import {emitSoftReset} from '#/state/events'
import {useFetchHandle} from '#/state/queries/handle'
import {useUnreadMessageCount} from '#/state/queries/messages/list-converations'
import {useUnreadNotifications} from '#/state/queries/notifications/unread'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {useComposerControls} from '#/state/shell/composer'
import {usePalette} from 'lib/hooks/usePalette'
import {useWebMediaQueries} from 'lib/hooks/useWebMediaQueries'
import {
  BellIcon,
  BellIconSolid,
  CogIcon,
  CogIconSolid,
  ComposeIcon2,
  HashtagIcon,
  HomeIcon,
  HomeIconSolid,
  ListIcon,
  MagnifyingGlassIcon2,
  MagnifyingGlassIcon2Solid,
  UserIcon,
  UserIconSolid,
} from 'lib/icons'
import {getCurrentRoute, isStateAtTabRoot, isTab} from 'lib/routes/helpers'
import {makeProfileLink} from 'lib/routes/links'
import {CommonNavigatorParams, NavigationProp} from 'lib/routes/types'
import {colors, s} from 'lib/styles'
import {NavSignupCard} from '#/view/shell/NavSignupCard'
import {Link} from 'view/com/util/Link'
import {LoadingPlaceholder} from 'view/com/util/LoadingPlaceholder'
import {PressableWithHover} from 'view/com/util/PressableWithHover'
import {Text} from 'view/com/util/text/Text'
import {UserAvatar} from 'view/com/util/UserAvatar'
import {Envelope_Stroke2_Corner0_Rounded as Envelope} from '#/components/icons/Envelope'
import {Envelope_Filled_Stroke2_Corner0_Rounded as EnvelopeFilled} from '#/components/icons/Envelope'
import {router} from '../../../routes'

function ProfileCard() {
  const {currentAccount} = useSession()
  const {isLoading, data: profile} = useProfileQuery({did: currentAccount!.did})
  const {isDesktop} = useWebMediaQueries()
  const {_} = useLingui()
  const size = 48

  return !isLoading && profile ? (
    <Link
      href={makeProfileLink({
        did: currentAccount!.did,
        handle: currentAccount!.handle,
      })}
      style={[styles.profileCard, !isDesktop && styles.profileCardTablet]}
      title={_(msg`My Profile`)}
      asAnchor>
      <UserAvatar
        avatar={profile.avatar}
        size={size}
        type={profile?.associated?.labeler ? 'labeler' : 'user'}
      />
    </Link>
  ) : (
    <View style={[styles.profileCard, !isDesktop && styles.profileCardTablet]}>
      <LoadingPlaceholder
        width={size}
        height={size}
        style={{borderRadius: size}}
      />
    </View>
  )
}

function BackBtn() {
  const {isTablet} = useWebMediaQueries()
  const pal = usePalette('default')
  const navigation = useNavigation<NavigationProp>()
  const {_} = useLingui()
  const shouldShow = useNavigationState(state => !isStateAtTabRoot(state))

  const onPressBack = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('Home')
    }
  }, [navigation])

  if (!shouldShow || isTablet) {
    return <></>
  }
  return (
    <TouchableOpacity
      testID="viewHeaderBackOrMenuBtn"
      onPress={onPressBack}
      style={styles.backBtn}
      accessibilityRole="button"
      accessibilityLabel={_(msg`Go back`)}
      accessibilityHint="">
      <FontAwesomeIcon
        size={24}
        icon="angle-left"
        style={pal.text as FontAwesomeIconStyle}
      />
    </TouchableOpacity>
  )
}

interface NavItemProps {
  count?: string
  href: string
  icon: JSX.Element
  iconFilled: JSX.Element
  label: string
}
function NavItem({count, href, icon, iconFilled, label}: NavItemProps) {
  const pal = usePalette('default')
  const {currentAccount} = useSession()
  const {isDesktop, isTablet} = useWebMediaQueries()
  const [pathName] = React.useMemo(() => router.matchPath(href), [href])
  const currentRouteInfo = useNavigationState(state => {
    if (!state) {
      return {name: 'Home'}
    }
    return getCurrentRoute(state)
  })
  let isCurrent =
    currentRouteInfo.name === 'Profile'
      ? isTab(currentRouteInfo.name, pathName) &&
        (currentRouteInfo.params as CommonNavigatorParams['Profile']).name ===
          currentAccount?.handle
      : isTab(currentRouteInfo.name, pathName)
  const {onPress} = useLinkProps({to: href})
  const onPressWrapped = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return
      }
      e.preventDefault()
      if (isCurrent) {
        emitSoftReset()
      } else {
        onPress()
      }
    },
    [onPress, isCurrent],
  )

  return (
    <PressableWithHover
      style={styles.navItemWrapper}
      hoverStyle={pal.viewLight}
      // @ts-ignore the function signature differs on web -prf
      onPress={onPressWrapped}
      // @ts-ignore web only -prf
      href={href}
      dataSet={{noUnderline: 1}}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityHint="">
      <View
        style={[
          styles.navItemIconWrapper,
          isTablet && styles.navItemIconWrapperTablet,
        ]}>
        {isCurrent ? iconFilled : icon}
        {typeof count === 'string' && count ? (
          <Text
            type="button"
            style={[
              styles.navItemCount,
              isTablet && styles.navItemCountTablet,
            ]}>
            {count}
          </Text>
        ) : null}
      </View>
      {isDesktop && (
        <Text type="title" style={[isCurrent ? s.bold : s.normal, pal.text]}>
          {label}
        </Text>
      )}
    </PressableWithHover>
  )
}

function ComposeBtn() {
  const {currentAccount} = useSession()
  const {getState} = useNavigation()
  const {openComposer} = useComposerControls()
  const {_} = useLingui()
  const {isTablet} = useWebMediaQueries()
  const [isFetchingHandle, setIsFetchingHandle] = React.useState(false)
  const fetchHandle = useFetchHandle()

  const getProfileHandle = async () => {
    const routes = getState()?.routes
    const currentRoute = routes?.[routes?.length - 1]

    if (currentRoute?.name === 'Profile') {
      let handle: string | undefined = (
        currentRoute.params as CommonNavigatorParams['Profile']
      ).name

      if (handle.startsWith('did:')) {
        try {
          setIsFetchingHandle(true)
          handle = await fetchHandle(handle)
        } catch (e) {
          handle = undefined
        } finally {
          setIsFetchingHandle(false)
        }
      }

      if (
        !handle ||
        handle === currentAccount?.handle ||
        isInvalidHandle(handle)
      )
        return undefined

      return handle
    }

    return undefined
  }

  const onPressCompose = async () =>
    openComposer({mention: await getProfileHandle()})

  if (isTablet) {
    return null
  }
  return (
    <View style={styles.newPostBtnContainer}>
      <TouchableOpacity
        disabled={isFetchingHandle}
        style={styles.newPostBtn}
        onPress={onPressCompose}
        accessibilityRole="button"
        accessibilityLabel={_(msg`New post`)}
        accessibilityHint="">
        <View style={styles.newPostBtnIconWrapper}>
          <ComposeIcon2
            size={19}
            strokeWidth={2}
            style={styles.newPostBtnLabel}
          />
        </View>
        <Text type="button" style={styles.newPostBtnLabel}>
          <Trans context="action">New Post</Trans>
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export function DesktopLeftNav() {
  const {hasSession, currentAccount} = useSession()
  const pal = usePalette('default')
  const {_} = useLingui()
  const {isDesktop, isTablet} = useWebMediaQueries()
  const numUnreadNotifications = useUnreadNotifications()
  const numUnreadMessages = useUnreadMessageCount()
  const gate = useGate()

  if (!hasSession && !isDesktop) {
    return null
  }

  return (
    <View
      style={[
        styles.leftNav,
        isTablet && styles.leftNavTablet,
        pal.view,
        pal.border,
      ]}>
      {hasSession ? (
        <ProfileCard />
      ) : isDesktop ? (
        <View style={{paddingHorizontal: 12}}>
          <NavSignupCard />
        </View>
      ) : null}

      {hasSession && (
        <>
          <BackBtn />

          <NavItem
            href="/"
            icon={<HomeIcon size={isDesktop ? 24 : 28} style={pal.text} />}
            iconFilled={
              <HomeIconSolid
                strokeWidth={4}
                size={isDesktop ? 24 : 28}
                style={pal.text}
              />
            }
            label={_(msg`Home`)}
          />
          <NavItem
            href="/search"
            icon={
              <MagnifyingGlassIcon2
                strokeWidth={2}
                size={isDesktop ? 24 : 26}
                style={pal.text}
              />
            }
            iconFilled={
              <MagnifyingGlassIcon2Solid
                strokeWidth={2}
                size={isDesktop ? 24 : 26}
                style={pal.text}
              />
            }
            label={_(msg`Search`)}
          />
          <NavItem
            href="/notifications"
            count={numUnreadNotifications}
            icon={
              <BellIcon
                strokeWidth={2}
                size={isDesktop ? 24 : 26}
                style={pal.text}
              />
            }
            iconFilled={
              <BellIconSolid
                strokeWidth={1.5}
                size={isDesktop ? 24 : 26}
                style={pal.text}
              />
            }
            label={_(msg`Notifications`)}
          />
          {gate('dms') && (
            <NavItem
              href="/messages"
              count={numUnreadMessages.numUnread}
              icon={<Envelope style={pal.text} width={isDesktop ? 26 : 30} />}
              iconFilled={
                <EnvelopeFilled style={pal.text} width={isDesktop ? 26 : 30} />
              }
              label={_(msg`Messages`)}
            />
          )}
          <NavItem
            href="/feeds"
            icon={
              <HashtagIcon
                strokeWidth={2.25}
                style={pal.text as FontAwesomeIconStyle}
                size={isDesktop ? 24 : 28}
              />
            }
            iconFilled={
              <HashtagIcon
                strokeWidth={4}
                style={pal.text as FontAwesomeIconStyle}
                size={isDesktop ? 24 : 28}
              />
            }
            label={_(msg`Feeds`)}
          />
          <NavItem
            href="/lists"
            icon={
              <ListIcon
                style={pal.text}
                size={isDesktop ? 26 : 30}
                strokeWidth={2}
              />
            }
            iconFilled={
              <ListIcon
                style={pal.text}
                size={isDesktop ? 26 : 30}
                strokeWidth={3}
              />
            }
            label={_(msg`Lists`)}
          />
          <NavItem
            href={currentAccount ? makeProfileLink(currentAccount) : '/'}
            icon={
              <UserIcon
                strokeWidth={1.75}
                size={isDesktop ? 28 : 30}
                style={pal.text}
              />
            }
            iconFilled={
              <UserIconSolid
                strokeWidth={1.75}
                size={isDesktop ? 28 : 30}
                style={pal.text}
              />
            }
            label={_(msg`Profile`)}
          />
          <NavItem
            href="/settings"
            icon={
              <CogIcon
                strokeWidth={1.75}
                size={isDesktop ? 28 : 32}
                style={pal.text}
              />
            }
            iconFilled={
              <CogIconSolid
                strokeWidth={1.5}
                size={isDesktop ? 28 : 32}
                style={pal.text}
              />
            }
            label={_(msg`Settings`)}
          />

          <ComposeBtn />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  leftNav: {
    // @ts-ignore web only
    position: 'fixed',
    top: 10,
    // @ts-ignore web only
    left: 'calc(50vw - 300px - 220px - 20px)',
    width: 220,
    // @ts-ignore web only
    maxHeight: 'calc(100vh - 10px)',
    overflowY: 'auto',
  },
  leftNavTablet: {
    top: 0,
    left: 0,
    right: 'auto',
    borderRightWidth: 1,
    height: '100%',
    width: 76,
    alignItems: 'center',
  },

  profileCard: {
    marginVertical: 10,
    width: 90,
    paddingLeft: 12,
  },
  profileCardTablet: {
    width: 70,
  },

  backBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
  },

  navItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  navItemIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    marginTop: 2,
    zIndex: 1,
  },
  navItemIconWrapperTablet: {
    width: 40,
    height: 40,
  },
  navItemCount: {
    position: 'absolute',
    top: 0,
    left: 15,
    backgroundColor: colors.blue3,
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  navItemCountTablet: {
    left: 18,
    fontSize: 14,
  },

  newPostBtnContainer: {
    flexDirection: 'row',
  },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingTop: 10,
    paddingBottom: 12, // visually aligns the text vertically inside the button
    paddingLeft: 16,
    paddingRight: 18, // looks nicer like this
    backgroundColor: colors.blue3,
    marginLeft: 12,
    marginTop: 20,
    marginBottom: 10,
    gap: 8,
  },
  newPostBtnIconWrapper: {
    marginTop: 2, // aligns the icon visually with the text
  },
  newPostBtnLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
})
