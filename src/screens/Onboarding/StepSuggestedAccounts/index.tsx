import React from 'react'
import {View} from 'react-native'
import {AppBskyActorDefs} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useAnalytics} from '#/lib/analytics/analytics'
import {logEvent} from '#/lib/statsig/statsig'
import {capitalize} from '#/lib/strings/capitalize'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useProfilesQuery} from '#/state/queries/profile'
import {
  DescriptionText,
  OnboardingControls,
  TitleText,
} from '#/screens/Onboarding/Layout'
import {Context} from '#/screens/Onboarding/state'
import {
  SuggestedAccountCard,
  SuggestedAccountCardPlaceholder,
} from '#/screens/Onboarding/StepSuggestedAccounts/SuggestedAccountCard'
import {aggregateInterestItems} from '#/screens/Onboarding/util'
import {atoms as a, useBreakpoints} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Toggle from '#/components/forms/Toggle'
import {IconCircle} from '#/components/IconCircle'
import {At_Stroke2_Corner0_Rounded as At} from '#/components/icons/At'
import {PlusLarge_Stroke2_Corner0_Rounded as Plus} from '#/components/icons/Plus'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

export function Inner({
  profiles,
  onSelect,
  moderationOpts,
}: {
  profiles: AppBskyActorDefs.ProfileViewDetailed[]
  onSelect: (dids: string[]) => void
  moderationOpts: ReturnType<typeof useModerationOpts>
}) {
  const {_} = useLingui()
  const [dids, setDids] = React.useState<string[]>(profiles.map(p => p.did))

  React.useEffect(() => {
    onSelect(dids)
  }, [dids, onSelect])

  return (
    <Toggle.Group
      values={dids}
      onChange={setDids}
      label={_(msg`Select some accounts below to follow`)}>
      <View style={[a.gap_md]}>
        {profiles.map(profile => (
          <Toggle.Item
            key={profile.did}
            name={profile.did}
            label={_(msg`Follow ${profile.handle}`)}>
            <SuggestedAccountCard
              profile={profile}
              moderationOpts={moderationOpts}
            />
          </Toggle.Item>
        ))}
      </View>
    </Toggle.Group>
  )
}

export function StepSuggestedAccounts() {
  const {_} = useLingui()
  const {gtMobile} = useBreakpoints()
  const {track} = useAnalytics()
  const {state, dispatch, interestsDisplayNames} = React.useContext(Context)
  const suggestedDids = React.useMemo(() => {
    return aggregateInterestItems(
      state.interestsStepResults.selectedInterests,
      state.interestsStepResults.apiResponse.suggestedAccountDids,
      state.interestsStepResults.apiResponse.suggestedAccountDids.default || [],
    )
  }, [state.interestsStepResults])
  const moderationOpts = useModerationOpts()
  const {
    isLoading: isProfilesLoading,
    isError,
    data,
    error,
  } = useProfilesQuery({
    handles: suggestedDids,
  })
  const [dids, setDids] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  const interestsText = React.useMemo(() => {
    const i = state.interestsStepResults.selectedInterests.map(
      i => interestsDisplayNames[i] || capitalize(i),
    )
    return i.join(', ')
  }, [state.interestsStepResults.selectedInterests, interestsDisplayNames])

  const handleContinue = React.useCallback(async () => {
    setSaving(true)

    if (dids.length) {
      dispatch({type: 'setSuggestedAccountsStepResults', accountDids: dids})
    }

    setSaving(false)
    dispatch({type: 'next'})
    track('OnboardingV2:StepSuggestedAccounts:End', {
      selectedAccountsLength: dids.length,
    })
    logEvent('onboarding:suggestedAccounts:nextPressed', {
      selectedAccountsLength: dids.length,
      skipped: false,
    })
  }, [dids, setSaving, dispatch, track])

  const handleSkip = React.useCallback(() => {
    // if a user comes back and clicks skip, erase follows
    dispatch({type: 'setSuggestedAccountsStepResults', accountDids: []})
    dispatch({type: 'next'})
    logEvent('onboarding:suggestedAccounts:nextPressed', {
      selectedAccountsLength: 0,
      skipped: true,
    })
  }, [dispatch])

  const isLoading = isProfilesLoading && moderationOpts

  React.useEffect(() => {
    track('OnboardingV2:StepSuggestedAccounts:Start')
  }, [track])

  return (
    <View style={[a.align_start]}>
      <IconCircle icon={At} style={[a.mb_2xl]} />

      <TitleText>
        <Trans>Here are some accounts for you to follow</Trans>
      </TitleText>
      <DescriptionText>
        {state.interestsStepResults.selectedInterests.length ? (
          <Trans>Based on your interest in {interestsText}</Trans>
        ) : (
          <Trans>These are popular accounts you might like:</Trans>
        )}
      </DescriptionText>

      <View style={[a.w_full, a.pt_xl]}>
        {isLoading ? (
          <View style={[a.gap_md]}>
            {Array(10)
              .fill(0)
              .map((_, i) => (
                <SuggestedAccountCardPlaceholder key={i} />
              ))}
          </View>
        ) : isError || !data ? (
          <Text>{error?.toString()}</Text>
        ) : (
          <Inner
            profiles={data.profiles}
            onSelect={setDids}
            moderationOpts={moderationOpts}
          />
        )}
      </View>

      <OnboardingControls.Portal>
        <View
          style={[
            a.gap_md,
            gtMobile ? {flexDirection: 'row-reverse'} : a.flex_col,
          ]}>
          <Button
            disabled={dids.length === 0}
            variant="gradient"
            color="gradient_sky"
            size="large"
            label={_(
              msg`Follow selected accounts and continue to the next step`,
            )}
            onPress={handleContinue}>
            <ButtonText>
              {dids.length === 20 ? (
                <Trans>Follow All</Trans>
              ) : (
                <Trans>Follow</Trans>
              )}
            </ButtonText>
            <ButtonIcon icon={saving ? Loader : Plus} position="right" />
          </Button>
          <Button
            variant="solid"
            color="secondary"
            size="large"
            label={_(
              msg`Continue to the next step without following any accounts`,
            )}
            onPress={handleSkip}>
            <ButtonText>
              <Trans>Skip</Trans>
            </ButtonText>
          </Button>
        </View>
      </OnboardingControls.Portal>
    </View>
  )
}
