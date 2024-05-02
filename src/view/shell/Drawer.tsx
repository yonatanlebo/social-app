import React, {ComponentProps} from 'react'
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import {
  FontAwesomeIcon,
  FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {StackActions, useNavigation} from '@react-navigation/native'

import {emitSoftReset} from '#/state/events'
import {useUnreadNotifications} from '#/state/queries/notifications/unread'
import {useProfileQuery} from '#/state/queries/profile'
import {SessionAccount, useSession} from '#/state/session'
import {useSetDrawerOpen} from '#/state/shell'
import {useAnalytics} from 'lib/analytics/analytics'
import {FEEDBACK_FORM_URL, HELP_DESK_URL} from 'lib/constants'
import {useNavigationTabState} from 'lib/hooks/useNavigationTabState'
import {usePalette} from 'lib/hooks/usePalette'
import {
  BellIcon,
  BellIconSolid,
  CogIcon,
  HashtagIcon,
  HomeIcon,
  HomeIconSolid,
  ListIcon,
  MagnifyingGlassIcon2,
  MagnifyingGlassIcon2Solid,
  UserIcon,
  UserIconSolid,
} from 'lib/icons'
import {getTabState, TabState} from 'lib/routes/helpers'
import {NavigationProp} from 'lib/routes/types'
import {pluralize} from 'lib/strings/helpers'
import {colors, s} from 'lib/styles'
import {useTheme} from 'lib/ThemeContext'
import {isWeb} from 'platform/detection'
import {NavSignupCard} from '#/view/shell/NavSignupCard'
import {formatCountShortOnly} from 'view/com/util/numeric/format'
import {Text} from 'view/com/util/text/Text'
import {UserAvatar} from 'view/com/util/UserAvatar'
import {useTheme as useAlfTheme} from '#/alf'
import {TextLink} from '../com/util/Link'

let DrawerProfileCard = ({
  account,
  onPressProfile,
}: {
  account: SessionAccount
  onPressProfile: () => void
}): React.ReactNode => {
  const {_} = useLingui()
  const pal = usePalette('default')
  const {data: profile} = useProfileQuery({did: account.did})

  return (
    <TouchableOpacity
      testID="profileCardButton"
      accessibilityLabel={_(msg`Profile`)}
      accessibilityHint={_(msg`Navigates to your profile`)}
      onPress={onPressProfile}>
      <UserAvatar
        size={80}
        avatar={profile?.avatar}
        // See https://github.com/bluesky-social/social-app/pull/1801:
        usePlainRNImage={true}
        type={profile?.associated?.labeler ? 'labeler' : 'user'}
      />
      <Text
        type="title-lg"
        style={[pal.text, s.bold, styles.profileCardDisplayName]}
        numberOfLines={1}>
        {profile?.displayName || account.handle}
      </Text>
      <Text
        type="2xl"
        style={[pal.textLight, styles.profileCardHandle]}
        numberOfLines={1}>
        @{account.handle}
      </Text>
      <Text type="xl" style={[pal.textLight, styles.profileCardFollowers]}>
        <Text type="xl-medium" style={pal.text}>
          {formatCountShortOnly(profile?.followersCount ?? 0)}
        </Text>{' '}
        {pluralize(profile?.followersCount || 0, 'follower')} &middot;{' '}
        <Trans>
          <Text type="xl-medium" style={pal.text}>
            {formatCountShortOnly(profile?.followsCount ?? 0)}
          </Text>{' '}
          following
        </Trans>
      </Text>
    </TouchableOpacity>
  )
}
DrawerProfileCard = React.memo(DrawerProfileCard)
export {DrawerProfileCard}

let DrawerContent = ({}: {}): React.ReactNode => {
  const theme = useTheme()
  const t = useAlfTheme()
  const pal = usePalette('default')
  const {_} = useLingui()
  const setDrawerOpen = useSetDrawerOpen()
  const navigation = useNavigation<NavigationProp>()
  const {track} = useAnalytics()
  const {isAtHome, isAtSearch, isAtFeeds, isAtNotifications, isAtMyProfile} =
    useNavigationTabState()
  const {hasSession, currentAccount} = useSession()

  // events
  // =

  const onPressTab = React.useCallback(
    (tab: string) => {
      track('Menu:ItemClicked', {url: tab})
      const state = navigation.getState()
      setDrawerOpen(false)
      if (isWeb) {
        // hack because we have flat navigator for web and MyProfile does not exist on the web navigator -ansh
        if (tab === 'MyProfile') {
          navigation.navigate('Profile', {name: currentAccount!.handle})
        } else {
          // @ts-ignore must be Home, Search, Notifications, or MyProfile
          navigation.navigate(tab)
        }
      } else {
        const tabState = getTabState(state, tab)
        if (tabState === TabState.InsideAtRoot) {
          emitSoftReset()
        } else if (tabState === TabState.Inside) {
          navigation.dispatch(StackActions.popToTop())
        } else {
          // @ts-ignore must be Home, Search, Notifications, or MyProfile
          navigation.navigate(`${tab}Tab`)
        }
      }
    },
    [track, navigation, setDrawerOpen, currentAccount],
  )

  const onPressHome = React.useCallback(() => onPressTab('Home'), [onPressTab])

  const onPressSearch = React.useCallback(
    () => onPressTab('Search'),
    [onPressTab],
  )

  const onPressNotifications = React.useCallback(
    () => onPressTab('Notifications'),
    [onPressTab],
  )

  const onPressProfile = React.useCallback(() => {
    onPressTab('MyProfile')
  }, [onPressTab])

  const onPressMyFeeds = React.useCallback(
    () => onPressTab('Feeds'),
    [onPressTab],
  )

  const onPressLists = React.useCallback(() => {
    track('Menu:ItemClicked', {url: 'Lists'})
    navigation.navigate('Lists')
    setDrawerOpen(false)
  }, [navigation, track, setDrawerOpen])

  const onPressSettings = React.useCallback(() => {
    track('Menu:ItemClicked', {url: 'Settings'})
    navigation.navigate('Settings')
    setDrawerOpen(false)
  }, [navigation, track, setDrawerOpen])

  const onPressFeedback = React.useCallback(() => {
    track('Menu:FeedbackClicked')
    Linking.openURL(
      FEEDBACK_FORM_URL({
        email: currentAccount?.email,
        handle: currentAccount?.handle,
      }),
    )
  }, [track, currentAccount])

  const onPressHelp = React.useCallback(() => {
    track('Menu:HelpClicked')
    Linking.openURL(HELP_DESK_URL)
  }, [track])

  // rendering
  // =

  return (
    <View
      testID="drawer"
      style={[
        styles.view,
        theme.colorScheme === 'light' ? pal.view : t.atoms.bg_contrast_25,
      ]}>
      <SafeAreaView style={s.flex1}>
        <ScrollView style={styles.main}>
          {hasSession && currentAccount ? (
            <View style={{}}>
              <DrawerProfileCard
                account={currentAccount}
                onPressProfile={onPressProfile}
              />
            </View>
          ) : (
            <View style={{paddingRight: 20}}>
              <NavSignupCard />
            </View>
          )}

          {hasSession ? (
            <>
              <View style={{height: 16}} />
              <SearchMenuItem isActive={isAtSearch} onPress={onPressSearch} />
              <HomeMenuItem isActive={isAtHome} onPress={onPressHome} />
              <NotificationsMenuItem
                isActive={isAtNotifications}
                onPress={onPressNotifications}
              />
              <FeedsMenuItem isActive={isAtFeeds} onPress={onPressMyFeeds} />
              <ListsMenuItem onPress={onPressLists} />
              <ProfileMenuItem
                isActive={isAtMyProfile}
                onPress={onPressProfile}
              />
              <SettingsMenuItem onPress={onPressSettings} />
            </>
          ) : (
            <>
              <HomeMenuItem isActive={isAtHome} onPress={onPressHome} />
              <FeedsMenuItem isActive={isAtFeeds} onPress={onPressMyFeeds} />
              <SearchMenuItem isActive={isAtSearch} onPress={onPressSearch} />
            </>
          )}

          <View style={styles.smallSpacer} />

          <View style={[{flexWrap: 'wrap', gap: 12}, s.flexCol]}>
            <TextLink
              type="md"
              style={pal.link}
              href="https://bsky.social/about/support/tos"
              text={_(msg`Terms of Service`)}
            />
            <TextLink
              type="md"
              style={pal.link}
              href="https://bsky.social/about/support/privacy-policy"
              text={_(msg`Privacy Policy`)}
            />
          </View>

          <View style={styles.smallSpacer} />
          <View style={styles.smallSpacer} />
        </ScrollView>

        <DrawerFooter
          onPressFeedback={onPressFeedback}
          onPressHelp={onPressHelp}
        />
      </SafeAreaView>
    </View>
  )
}
DrawerContent = React.memo(DrawerContent)
export {DrawerContent}

let DrawerFooter = ({
  onPressFeedback,
  onPressHelp,
}: {
  onPressFeedback: () => void
  onPressHelp: () => void
}): React.ReactNode => {
  const theme = useTheme()
  const pal = usePalette('default')
  const {_} = useLingui()
  return (
    <View style={styles.footer}>
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel={_(msg`Send feedback`)}
        accessibilityHint=""
        onPress={onPressFeedback}
        style={[
          styles.footerBtn,
          styles.footerBtnFeedback,
          theme.colorScheme === 'light'
            ? styles.footerBtnFeedbackLight
            : styles.footerBtnFeedbackDark,
        ]}>
        <FontAwesomeIcon
          style={pal.link as FontAwesomeIconStyle}
          size={18}
          icon={['far', 'message']}
        />
        <Text type="lg-medium" style={[pal.link, s.pl10]}>
          <Trans>Feedback</Trans>
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel={_(msg`Send feedback`)}
        accessibilityHint=""
        onPress={onPressHelp}
        style={[styles.footerBtn]}>
        <Text type="lg-medium" style={[pal.link, s.pl10]}>
          <Trans>Help</Trans>
        </Text>
      </TouchableOpacity>
    </View>
  )
}
DrawerFooter = React.memo(DrawerFooter)

interface MenuItemProps extends ComponentProps<typeof TouchableOpacity> {
  icon: JSX.Element
  label: string
  count?: string
  bold?: boolean
}

let SearchMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {_} = useLingui()
  const pal = usePalette('default')
  return (
    <MenuItem
      icon={
        isActive ? (
          <MagnifyingGlassIcon2Solid
            style={pal.text as StyleProp<ViewStyle>}
            size={24}
            strokeWidth={1.7}
          />
        ) : (
          <MagnifyingGlassIcon2
            style={pal.text as StyleProp<ViewStyle>}
            size={24}
            strokeWidth={1.7}
          />
        )
      }
      label={_(msg`Search`)}
      accessibilityLabel={_(msg`Search`)}
      accessibilityHint=""
      bold={isActive}
      onPress={onPress}
    />
  )
}
SearchMenuItem = React.memo(SearchMenuItem)

let HomeMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {_} = useLingui()
  const pal = usePalette('default')
  return (
    <MenuItem
      icon={
        isActive ? (
          <HomeIconSolid
            style={pal.text as StyleProp<ViewStyle>}
            size="24"
            strokeWidth={3.25}
          />
        ) : (
          <HomeIcon
            style={pal.text as StyleProp<ViewStyle>}
            size="24"
            strokeWidth={3.25}
          />
        )
      }
      label={_(msg`Home`)}
      accessibilityLabel={_(msg`Home`)}
      accessibilityHint=""
      bold={isActive}
      onPress={onPress}
    />
  )
}
HomeMenuItem = React.memo(HomeMenuItem)

let NotificationsMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {_} = useLingui()
  const pal = usePalette('default')
  const numUnreadNotifications = useUnreadNotifications()
  return (
    <MenuItem
      icon={
        isActive ? (
          <BellIconSolid
            style={pal.text as StyleProp<ViewStyle>}
            size="24"
            strokeWidth={1.7}
          />
        ) : (
          <BellIcon
            style={pal.text as StyleProp<ViewStyle>}
            size="24"
            strokeWidth={1.7}
          />
        )
      }
      label={_(msg`Notifications`)}
      accessibilityLabel={_(msg`Notifications`)}
      accessibilityHint={
        numUnreadNotifications === ''
          ? ''
          : _(msg`${numUnreadNotifications} unread`)
      }
      count={numUnreadNotifications}
      bold={isActive}
      onPress={onPress}
    />
  )
}
NotificationsMenuItem = React.memo(NotificationsMenuItem)

let FeedsMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {_} = useLingui()
  const pal = usePalette('default')
  return (
    <MenuItem
      icon={
        isActive ? (
          <HashtagIcon
            strokeWidth={3}
            style={pal.text as FontAwesomeIconStyle}
            size={24}
          />
        ) : (
          <HashtagIcon
            strokeWidth={2}
            style={pal.text as FontAwesomeIconStyle}
            size={24}
          />
        )
      }
      label={_(msg`Feeds`)}
      accessibilityLabel={_(msg`Feeds`)}
      accessibilityHint=""
      bold={isActive}
      onPress={onPress}
    />
  )
}
FeedsMenuItem = React.memo(FeedsMenuItem)

let ListsMenuItem = ({onPress}: {onPress: () => void}): React.ReactNode => {
  const {_} = useLingui()
  const pal = usePalette('default')
  return (
    <MenuItem
      icon={<ListIcon strokeWidth={2} style={pal.text} size={26} />}
      label={_(msg`Lists`)}
      accessibilityLabel={_(msg`Lists`)}
      accessibilityHint=""
      onPress={onPress}
    />
  )
}
ListsMenuItem = React.memo(ListsMenuItem)

let ProfileMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {_} = useLingui()
  const pal = usePalette('default')
  return (
    <MenuItem
      icon={
        isActive ? (
          <UserIconSolid
            style={pal.text as StyleProp<ViewStyle>}
            size="26"
            strokeWidth={1.5}
          />
        ) : (
          <UserIcon
            style={pal.text as StyleProp<ViewStyle>}
            size="26"
            strokeWidth={1.5}
          />
        )
      }
      label={_(msg`Profile`)}
      accessibilityLabel={_(msg`Profile`)}
      accessibilityHint=""
      onPress={onPress}
    />
  )
}
ProfileMenuItem = React.memo(ProfileMenuItem)

let SettingsMenuItem = ({onPress}: {onPress: () => void}): React.ReactNode => {
  const {_} = useLingui()
  const pal = usePalette('default')
  return (
    <MenuItem
      icon={
        <CogIcon
          style={pal.text as StyleProp<ViewStyle>}
          size="26"
          strokeWidth={1.75}
        />
      }
      label={_(msg`Settings`)}
      accessibilityLabel={_(msg`Settings`)}
      accessibilityHint=""
      onPress={onPress}
    />
  )
}
SettingsMenuItem = React.memo(SettingsMenuItem)

function MenuItem({
  icon,
  label,
  accessibilityLabel,
  count,
  bold,
  onPress,
}: MenuItemProps) {
  const pal = usePalette('default')
  return (
    <TouchableOpacity
      testID={`menuItemButton-${label}`}
      style={styles.menuItem}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="">
      <View style={[styles.menuItemIconWrapper]}>
        {icon}
        {count ? (
          <View
            style={[
              styles.menuItemCount,
              count.length > 2
                ? styles.menuItemCountHundreds
                : count.length > 1
                ? styles.menuItemCountTens
                : undefined,
            ]}>
            <Text style={styles.menuItemCountLabel} numberOfLines={1}>
              {count}
            </Text>
          </View>
        ) : undefined}
      </View>
      <Text
        type={bold ? '2xl-bold' : '2xl'}
        style={[pal.text, s.flex1]}
        numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  view: {
    flex: 1,
    paddingBottom: 50,
    maxWidth: 300,
  },
  viewDarkMode: {
    backgroundColor: '#1B1919',
  },
  main: {
    paddingRight: 20,
    paddingTop: 20,
  },
  smallSpacer: {
    height: 20,
  },

  profileCardDisplayName: {
    marginTop: 20,
    paddingRight: 30,
  },
  profileCardHandle: {
    marginTop: 4,
    paddingRight: 30,
  },
  profileCardFollowers: {
    marginTop: 16,
    paddingRight: 10,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: 10,
  },
  menuItemIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemCount: {
    position: 'absolute',
    width: 'auto',
    right: -6,
    top: -4,
    backgroundColor: colors.blue3,
    paddingHorizontal: 4,
    paddingBottom: 1,
    borderRadius: 6,
  },
  menuItemCountTens: {
    width: 25,
  },
  menuItemCountHundreds: {
    right: -12,
    width: 34,
  },
  menuItemCountLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    color: colors.white,
  },

  inviteCodes: {
    paddingRight: 0,
    paddingVertical: 8,
    flexDirection: 'row',
  },
  inviteCodesIcon: {
    marginRight: 6,
    flexShrink: 0,
    marginTop: 2,
  },

  footer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
    paddingTop: 20,
    paddingLeft: 20,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 25,
  },
  footerBtnFeedback: {
    paddingHorizontal: 20,
  },
  footerBtnFeedbackLight: {
    backgroundColor: '#DDEFFF',
  },
  footerBtnFeedbackDark: {
    backgroundColor: colors.blue6,
  },
})
