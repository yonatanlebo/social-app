import React from 'react'
import {GestureResponderEvent, View} from 'react-native'
import {
  AppBskyActorDefs,
  moderateProfile,
  ModerationOpts,
  RichText as RichTextApi,
} from '@atproto/api'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {useProfileFollowMutationQueue} from '#/state/queries/profile'
import {sanitizeHandle} from 'lib/strings/handles'
import {useProfileShadow} from 'state/cache/profile-shadow'
import {useSession} from 'state/session'
import * as Toast from '#/view/com/util/Toast'
import {ProfileCardPills} from 'view/com/profile/ProfileCard'
import {UserAvatar} from 'view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonProps, ButtonText} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {PlusLarge_Stroke2_Corner0_Rounded as Plus} from '#/components/icons/Plus'
import {Link as InternalLink, LinkProps} from '#/components/Link'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'

export function Default({
  profile,
  moderationOpts,
  logContext = 'ProfileCard',
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
  moderationOpts: ModerationOpts
  logContext?: 'ProfileCard' | 'StarterPackProfilesList'
}) {
  return (
    <Link did={profile.did}>
      <Card
        profile={profile}
        moderationOpts={moderationOpts}
        logContext={logContext}
      />
    </Link>
  )
}

export function Card({
  profile,
  moderationOpts,
  logContext = 'ProfileCard',
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
  moderationOpts: ModerationOpts
  logContext?: 'ProfileCard' | 'StarterPackProfilesList'
}) {
  const moderation = moderateProfile(profile, moderationOpts)

  return (
    <Outer>
      <Header>
        <Avatar profile={profile} moderationOpts={moderationOpts} />
        <NameAndHandle profile={profile} moderationOpts={moderationOpts} />
        <FollowButton profile={profile} logContext={logContext} />
      </Header>

      <ProfileCardPills
        followedBy={Boolean(profile.viewer?.followedBy)}
        moderation={moderation}
      />

      <Description profile={profile} />
    </Outer>
  )
}

export function Outer({
  children,
}: {
  children: React.ReactElement | React.ReactElement[]
}) {
  return <View style={[a.flex_1, a.gap_xs]}>{children}</View>
}

export function Header({
  children,
}: {
  children: React.ReactElement | React.ReactElement[]
}) {
  return <View style={[a.flex_row, a.gap_sm]}>{children}</View>
}

export function Link({did, children}: {did: string} & Omit<LinkProps, 'to'>) {
  return (
    <InternalLink
      to={{
        screen: 'Profile',
        params: {name: did},
      }}>
      {children}
    </InternalLink>
  )
}

export function Avatar({
  profile,
  moderationOpts,
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
  moderationOpts: ModerationOpts
}) {
  const moderation = moderateProfile(profile, moderationOpts)

  return (
    <UserAvatar
      size={42}
      avatar={profile.avatar}
      type={profile.associated?.labeler ? 'labeler' : 'user'}
      moderation={moderation.ui('avatar')}
    />
  )
}

export function NameAndHandle({
  profile,
  moderationOpts,
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
  moderationOpts: ModerationOpts
}) {
  const t = useTheme()
  const moderation = moderateProfile(profile, moderationOpts)
  const name = sanitizeDisplayName(
    profile.displayName || sanitizeHandle(profile.handle),
    moderation.ui('displayName'),
  )
  const handle = sanitizeHandle(profile.handle, '@')

  return (
    <View style={[a.flex_1]}>
      <Text style={[a.text_md, a.font_bold, a.leading_snug]} numberOfLines={1}>
        {name}
      </Text>
      <Text
        style={[a.leading_snug, t.atoms.text_contrast_medium]}
        numberOfLines={1}>
        {handle}
      </Text>
    </View>
  )
}

export function Description({
  profile: profileUnshadowed,
}: {
  profile: AppBskyActorDefs.ProfileViewDetailed
}) {
  const profile = useProfileShadow(profileUnshadowed)
  const {description} = profile
  const rt = React.useMemo(() => {
    if (!description) return
    const rt = new RichTextApi({text: description || ''})
    rt.detectFacetsWithoutResolution()
    return rt
  }, [description])
  if (!rt) return null
  if (
    profile.viewer &&
    (profile.viewer.blockedBy ||
      profile.viewer.blocking ||
      profile.viewer.blockingByList)
  )
    return null
  return (
    <View style={[a.pt_xs]}>
      <RichText
        value={rt}
        style={[a.leading_snug]}
        numberOfLines={3}
        disableLinks
      />
    </View>
  )
}

export type FollowButtonProps = {
  profile: AppBskyActorDefs.ProfileViewBasic
  logContext: 'ProfileCard' | 'StarterPackProfilesList'
} & Partial<ButtonProps>

export function FollowButton(props: FollowButtonProps) {
  const {currentAccount, hasSession} = useSession()
  const isMe = props.profile.did === currentAccount?.did
  return hasSession && !isMe ? <FollowButtonInner {...props} /> : null
}

export function FollowButtonInner({
  profile: profileUnshadowed,
  logContext,
  ...rest
}: FollowButtonProps) {
  const {_} = useLingui()
  const profile = useProfileShadow(profileUnshadowed)
  const [queueFollow, queueUnfollow] = useProfileFollowMutationQueue(
    profile,
    logContext,
  )
  const isRound = Boolean(rest.shape && rest.shape === 'round')

  const onPressFollow = async (e: GestureResponderEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await queueFollow()
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        Toast.show(_(msg`An issue occurred, please try again.`))
      }
    }
  }

  const onPressUnfollow = async (e: GestureResponderEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await queueUnfollow()
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        Toast.show(_(msg`An issue occurred, please try again.`))
      }
    }
  }

  const unfollowLabel = _(
    msg({
      message: 'Following',
      comment: 'User is following this account, click to unfollow',
    }),
  )
  const followLabel = _(
    msg({
      message: 'Follow',
      comment: 'User is not following this account, click to follow',
    }),
  )

  if (!profile.viewer) return null
  if (
    profile.viewer.blockedBy ||
    profile.viewer.blocking ||
    profile.viewer.blockingByList
  )
    return null

  return (
    <View>
      {profile.viewer.following ? (
        <Button
          label={unfollowLabel}
          size="small"
          variant="solid"
          color="secondary"
          {...rest}
          onPress={onPressUnfollow}>
          <ButtonIcon icon={Check} position={isRound ? undefined : 'left'} />
          {isRound ? null : <ButtonText>{unfollowLabel}</ButtonText>}
        </Button>
      ) : (
        <Button
          label={followLabel}
          size="small"
          variant="solid"
          color="primary"
          {...rest}
          onPress={onPressFollow}>
          <ButtonIcon icon={Plus} position={isRound ? undefined : 'left'} />
          {isRound ? null : <ButtonText>{followLabel}</ButtonText>}
        </Button>
      )}
    </View>
  )
}
