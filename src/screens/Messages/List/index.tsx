import React, {useCallback, useMemo, useState} from 'react'
import {View} from 'react-native'
import {ChatBskyConvoDefs} from '@atproto-labs/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'
import {NativeStackScreenProps} from '@react-navigation/native-stack'
import {sha256} from 'js-sha256'

import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {MessagesTabNavigatorParams, NavigationProp} from '#/lib/routes/types'
import {useGate} from '#/lib/statsig/statsig'
import {cleanError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {isNative} from '#/platform/detection'
import {useListConvos} from '#/state/queries/messages/list-converations'
import {useSession} from '#/state/session'
import {List} from '#/view/com/util/List'
import {TimeElapsed} from '#/view/com/util/TimeElapsed'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {ViewHeader} from '#/view/com/util/ViewHeader'
import {CenteredView} from '#/view/com/util/Views'
import {ScrollView} from '#/view/com/util/Views'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {DialogControlProps, useDialogControl} from '#/components/Dialog'
import {ConvoMenu} from '#/components/dms/ConvoMenu'
import {NewChat} from '#/components/dms/NewChat'
import * as TextField from '#/components/forms/TextField'
import {useRefreshOnFocus} from '#/components/hooks/useRefreshOnFocus'
import {PlusLarge_Stroke2_Corner0_Rounded as Plus} from '#/components/icons/Plus'
import {SettingsSliderVertical_Stroke2_Corner0_Rounded as SettingsSlider} from '#/components/icons/SettingsSlider'
import {Link} from '#/components/Link'
import {ListFooter, ListMaybePlaceholder} from '#/components/Lists'
import {useMenuControl} from '#/components/Menu'
import {Text} from '#/components/Typography'
import {ClipClopGate} from '../gate'
import {useDmServiceUrlStorage} from '../Temp/useDmServiceUrlStorage'

type Props = NativeStackScreenProps<MessagesTabNavigatorParams, 'Messages'>

function renderItem({
  item,
  index,
}: {
  item: ChatBskyConvoDefs.ConvoView
  index: number
}) {
  return <ChatListItem convo={item} index={index} />
}

function keyExtractor(item: ChatBskyConvoDefs.ConvoView) {
  return item.id
}

export function MessagesScreen({navigation, route}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const newChatControl = useDialogControl()
  const {gtMobile} = useBreakpoints()
  const pushToConversation = route.params?.pushToConversation

  // TEMP
  const {serviceUrl, setServiceUrl} = useDmServiceUrlStorage()
  const [serviceUrlValue, setServiceUrlValue] = useState(serviceUrl)
  const hasValidServiceUrl = useMemo(() => {
    const hash = sha256(serviceUrl)
    return (
      hash ===
      'a32318b49dd3fe6aa6a35c66c13fcc4c1cb6202b24f5a852d9a2279acee4169f'
    )
  }, [serviceUrl])

  // Whenever we have `pushToConversation` set, it means we pressed a notification for a chat without being on
  // this tab. We should immediately push to the conversation after pressing the notification.
  // After we push, reset with `setParams` so that this effect will fire next time we press a notification, even if
  // the conversation is the same as before
  React.useEffect(() => {
    if (pushToConversation) {
      navigation.navigate('MessagesConversation', {
        conversation: pushToConversation,
      })
      navigation.setParams({pushToConversation: undefined})
    }
  }, [navigation, pushToConversation])

  const renderButton = useCallback(() => {
    return (
      <Link
        to="/messages/settings"
        accessibilityLabel={_(msg`Message settings`)}
        accessibilityHint={_(msg`Opens the message settings page`)}>
        <SettingsSlider size="lg" style={t.atoms.text} />
      </Link>
    )
  }, [_, t.atoms.text])

  const initialNumToRender = useInitialNumToRender()
  const [isPTRing, setIsPTRing] = useState(false)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useListConvos({refetchInterval: 15_000})

  useRefreshOnFocus(refetch)

  const isError = !!error

  const conversations = useMemo(() => {
    if (data?.pages) {
      return data.pages.flatMap(page => page.convos)
    }
    return []
  }, [data])

  const onRefresh = useCallback(async () => {
    setIsPTRing(true)
    try {
      await refetch()
    } catch (err) {
      logger.error('Failed to refresh conversations', {message: err})
    }
    setIsPTRing(false)
  }, [refetch, setIsPTRing])

  const onEndReached = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage || isError) return
    try {
      await fetchNextPage()
    } catch (err) {
      logger.error('Failed to load more conversations', {message: err})
    }
  }, [isFetchingNextPage, hasNextPage, isError, fetchNextPage])

  const onNewChat = useCallback(
    (conversation: string) =>
      navigation.navigate('MessagesConversation', {conversation}),
    [navigation],
  )

  const onNavigateToSettings = useCallback(() => {
    navigation.navigate('MessagesSettings')
  }, [navigation])

  const gate = useGate()
  if (!gate('dms')) return <ClipClopGate />

  if (!hasValidServiceUrl) {
    return (
      <ScrollView contentContainerStyle={a.p_lg}>
        <View>
          <TextField.LabelText>Service URL</TextField.LabelText>
          <TextField.Root>
            <TextField.Input
              value={serviceUrlValue}
              onChangeText={text => setServiceUrlValue(text)}
              autoCapitalize="none"
              keyboardType="url"
              label="https://"
            />
          </TextField.Root>
          <Button
            label="Set Service URL"
            size="small"
            variant="solid"
            color="primary"
            onPress={() => setServiceUrl(serviceUrlValue)}>
            <ButtonText>Set</ButtonText>
          </Button>
        </View>
      </ScrollView>
    )
  }

  if (conversations.length < 1) {
    return (
      <View style={a.flex_1}>
        {gtMobile ? (
          <CenteredView sideBorders>
            <DesktopHeader
              newChatControl={newChatControl}
              onNavigateToSettings={onNavigateToSettings}
            />
          </CenteredView>
        ) : (
          <ViewHeader
            title={_(msg`Messages`)}
            renderButton={renderButton}
            showBorder
            canGoBack={false}
          />
        )}
        {!isError && <NewChat onNewChat={onNewChat} control={newChatControl} />}
        <ListMaybePlaceholder
          isLoading={isLoading}
          isError={isError}
          emptyType="results"
          emptyTitle={_(msg`No messages yet`)}
          emptyMessage={_(
            msg`You have no messages yet. Start a conversation with someone!`,
          )}
          errorMessage={cleanError(error)}
          onRetry={isError ? refetch : undefined}
          hideBackButton
        />
      </View>
    )
  }

  return (
    <View style={a.flex_1}>
      {!gtMobile && (
        <ViewHeader
          title={_(msg`Messages`)}
          renderButton={renderButton}
          showBorder={false}
          canGoBack={false}
        />
      )}
      <NewChat onNewChat={onNewChat} control={newChatControl} />
      <List
        data={conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshing={isPTRing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        ListHeaderComponent={
          <DesktopHeader
            newChatControl={newChatControl}
            onNavigateToSettings={onNavigateToSettings}
          />
        }
        ListFooterComponent={
          <ListFooter
            isFetchingNextPage={isFetchingNextPage}
            error={cleanError(error)}
            onRetry={fetchNextPage}
            style={{borderColor: 'transparent'}}
          />
        }
        onEndReachedThreshold={3}
        initialNumToRender={initialNumToRender}
        windowSize={11}
        // @ts-ignore our .web version only -sfn
        desktopFixedHeight
      />
    </View>
  )
}

function ChatListItem({
  convo,
  index,
}: {
  convo: ChatBskyConvoDefs.ConvoView
  index: number
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const menuControl = useMenuControl()
  const {gtMobile} = useBreakpoints()

  let lastMessage = _(msg`No messages yet`)
  let lastMessageSentAt: string | null = null
  if (ChatBskyConvoDefs.isMessageView(convo.lastMessage)) {
    if (convo.lastMessage.sender?.did === currentAccount?.did) {
      lastMessage = _(msg`You: ${convo.lastMessage.text}`)
    } else {
      lastMessage = convo.lastMessage.text
    }
    lastMessageSentAt = convo.lastMessage.sentAt
  }
  if (ChatBskyConvoDefs.isDeletedMessageView(convo.lastMessage)) {
    lastMessage = _(msg`Message deleted`)
  }

  const otherUser = convo.members.find(
    member => member.did !== currentAccount?.did,
  )

  const navigation = useNavigation<NavigationProp>()
  const [showActions, setShowActions] = React.useState(false)

  const onMouseEnter = React.useCallback(() => {
    setShowActions(true)
  }, [])

  const onMouseLeave = React.useCallback(() => {
    setShowActions(false)
  }, [])

  const onFocus = React.useCallback<React.FocusEventHandler>(e => {
    if (e.nativeEvent.relatedTarget == null) return
    setShowActions(true)
  }, [])

  const onPress = React.useCallback(() => {
    navigation.push('MessagesConversation', {
      conversation: convo.id,
    })
  }, [convo.id, navigation])

  if (!otherUser) {
    return null
  }

  return (
    <View
      // @ts-expect-error web only
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onMouseLeave}>
      <Button
        label={otherUser.displayName || otherUser.handle}
        onPress={onPress}
        style={a.flex_1}
        onLongPress={isNative ? menuControl.open : undefined}>
        {({hovered, pressed}) => (
          <View
            style={[
              a.flex_row,
              a.flex_1,
              a.px_lg,
              a.py_md,
              a.gap_md,
              (hovered || pressed) && t.atoms.bg_contrast_25,
              index === 0 && [a.border_t, a.pt_lg],
              t.atoms.border_contrast_low,
            ]}>
            <UserAvatar avatar={otherUser?.avatar} size={52} />
            <View style={[a.flex_1, a.flex_row, a.align_center]}>
              <View style={[a.flex_1]}>
                <View
                  style={[
                    a.flex_1,
                    a.flex_row,
                    a.align_end,
                    a.pb_2xs,
                    web([{marginTop: -2}]),
                  ]}>
                  <Text
                    numberOfLines={1}
                    style={[{maxWidth: '85%'}, web([a.leading_normal])]}>
                    <Text style={[a.text_md, t.atoms.text, a.font_bold]}>
                      {otherUser.displayName || otherUser.handle}
                    </Text>
                  </Text>
                  {lastMessageSentAt && (
                    <TimeElapsed timestamp={lastMessageSentAt}>
                      {({timeElapsed}) => (
                        <Text
                          style={[
                            a.text_sm,
                            web([a.leading_normal]),
                            t.atoms.text_contrast_medium,
                          ]}>
                          {' '}
                          &middot; {timeElapsed}
                        </Text>
                      )}
                    </TimeElapsed>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[a.text_sm, t.atoms.text_contrast_medium, a.pb_xs]}>
                  @{otherUser.handle}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[
                    a.text_sm,
                    a.leading_snug,
                    convo.unreadCount > 0
                      ? a.font_bold
                      : t.atoms.text_contrast_high,
                  ]}>
                  {lastMessage}
                </Text>
              </View>
              {convo.unreadCount > 0 && (
                <View
                  style={[
                    a.absolute,
                    a.rounded_full,
                    {
                      backgroundColor: convo.muted
                        ? t.palette.contrast_200
                        : t.palette.primary_500,
                      height: 7,
                      width: 7,
                    },
                    isNative
                      ? {
                          top: 15,
                          right: 12,
                        }
                      : {
                          top: 0,
                          right: 0,
                        },
                  ]}
                />
              )}
              <ConvoMenu
                convo={convo}
                profile={otherUser}
                control={menuControl}
                currentScreen="list"
                showMarkAsRead={convo.unreadCount > 0}
                hideTrigger={isNative}
                triggerOpacity={
                  !gtMobile || showActions || menuControl.isOpen ? 1 : 0
                }
              />
            </View>
          </View>
        )}
      </Button>
    </View>
  )
}

function DesktopHeader({
  newChatControl,
  onNavigateToSettings,
}: {
  newChatControl: DialogControlProps
  onNavigateToSettings: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {gtMobile, gtTablet} = useBreakpoints()

  if (!gtMobile) {
    return null
  }

  return (
    <View
      style={[
        t.atoms.bg,
        a.flex_row,
        a.align_center,
        a.justify_between,
        a.gap_lg,
        a.px_lg,
        a.py_sm,
      ]}>
      <Text style={[a.text_2xl, a.font_bold]}>
        <Trans>Messages</Trans>
      </Text>
      <View style={[a.flex_row, a.align_center, a.gap_md]}>
        <Button
          label={_(msg`Message settings`)}
          color="secondary"
          size="large"
          variant="ghost"
          style={[{height: 'auto', width: 'auto'}, a.px_sm, a.py_sm]}
          onPress={onNavigateToSettings}>
          <ButtonIcon icon={SettingsSlider} />
        </Button>
        {gtTablet && (
          <Button
            label={_(msg`New chat`)}
            color="primary"
            size="large"
            variant="solid"
            style={[{height: 'auto', width: 'auto'}, a.px_md, a.py_sm]}
            onPress={newChatControl.open}>
            <ButtonIcon icon={Plus} position="right" />
            <ButtonText>
              <Trans>New chat</Trans>
            </ButtonText>
          </Button>
        )}
      </View>
    </View>
  )
}
