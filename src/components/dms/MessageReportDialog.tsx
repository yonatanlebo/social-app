import React, {memo, useMemo, useState} from 'react'
import {View} from 'react-native'
import {
  ChatBskyConvoDefs,
  ComAtprotoModerationCreateReport,
  RichText as RichTextAPI,
} from '@atproto/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useMutation} from '@tanstack/react-query'

import {ReportOption} from '#/lib/moderation/useReportOptions'
import {isAndroid} from '#/platform/detection'
import {useAgent} from '#/state/session'
import {CharProgress} from '#/view/com/composer/char-progress/CharProgress'
import * as Toast from '#/view/com/util/Toast'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {Button, ButtonIcon, ButtonText} from '../Button'
import {Divider} from '../Divider'
import {ChevronLeft_Stroke2_Corner0_Rounded as Chevron} from '../icons/Chevron'
import {Loader} from '../Loader'
import {SelectReportOptionView} from '../ReportDialog/SelectReportOptionView'
import {RichText} from '../RichText'
import {Text} from '../Typography'
import {MessageItemMetadata} from './MessageItem'

let MessageReportDialog = ({
  control,
  message,
}: {
  control: Dialog.DialogControlProps
  message: ChatBskyConvoDefs.MessageView
}): React.ReactNode => {
  const {_} = useLingui()
  return (
    <Dialog.Outer
      control={control}
      nativeOptions={isAndroid ? {sheet: {snapPoints: ['100%']}} : {}}>
      <Dialog.Handle />
      <Dialog.ScrollableInner label={_(msg`Report this message`)}>
        <DialogInner message={message} />
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}
MessageReportDialog = memo(MessageReportDialog)
export {MessageReportDialog}

function DialogInner({message}: {message: ChatBskyConvoDefs.MessageView}) {
  const [reportOption, setReportOption] = useState<ReportOption | null>(null)

  return reportOption ? (
    <SubmitStep
      message={message}
      reportOption={reportOption}
      goBack={() => setReportOption(null)}
    />
  ) : (
    <ReasonStep setReportOption={setReportOption} />
  )
}

function ReasonStep({
  setReportOption,
}: {
  setReportOption: (reportOption: ReportOption) => void
}) {
  const control = Dialog.useDialogContext()

  return (
    <SelectReportOptionView
      labelers={[]}
      goBack={control.close}
      params={{type: 'message'}}
      onSelectReportOption={setReportOption}
    />
  )
}

function SubmitStep({
  message,
  reportOption,
  goBack,
}: {
  message: ChatBskyConvoDefs.MessageView
  reportOption: ReportOption
  goBack: () => void
}) {
  const {_} = useLingui()
  const {gtMobile} = useBreakpoints()
  const t = useTheme()
  const [details, setDetails] = useState('')
  const control = Dialog.useDialogContext()
  const {getAgent} = useAgent()

  const {
    mutate: submit,
    error,
    isPending: submitting,
  } = useMutation({
    mutationFn: async () => {
      const report = {
        reasonType: reportOption.reason,
        subject: {
          $type: 'chat.bsky.convo.defs#messageRef',
          messageId: message.id,
          did: message.sender!.did,
        } satisfies ChatBskyConvoDefs.MessageRef,
        reason: details,
      } satisfies ComAtprotoModerationCreateReport.InputSchema

      await getAgent().createModerationReport(report)
    },
    onSuccess: () => {
      control.close(() => {
        Toast.show(_(msg`Thank you. Your report has been sent.`))
      })
    },
  })

  return (
    <View style={a.gap_lg}>
      <Button
        size="small"
        variant="solid"
        color="secondary"
        shape="round"
        label={_(msg`Go back to previous step`)}
        onPress={goBack}>
        <ButtonIcon icon={Chevron} />
      </Button>

      <View style={[a.justify_center, gtMobile ? a.gap_sm : a.gap_xs]}>
        <Text style={[a.text_2xl, a.font_bold]}>
          <Trans>Report this message</Trans>
        </Text>
        <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
          <Trans>
            Your report will be sent to the Bluesky Moderation Service
          </Trans>
        </Text>
      </View>

      <PreviewMessage message={message} />

      <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
        <Trans>Reason: {reportOption.title}</Trans>
      </Text>

      <Divider />

      <View style={[a.gap_md]}>
        <Text style={[t.atoms.text_contrast_medium]}>
          <Trans>Optionally provide additional information below:</Trans>
        </Text>

        <View style={[a.relative, a.w_full]}>
          <Dialog.Input
            multiline
            value={details}
            onChangeText={setDetails}
            label="Text field"
            style={{paddingRight: 60}}
            numberOfLines={6}
          />

          <View
            style={[
              a.absolute,
              a.flex_row,
              a.align_center,
              a.pr_md,
              a.pb_sm,
              {
                bottom: 0,
                right: 0,
              },
            ]}>
            <CharProgress count={details?.length || 0} />
          </View>
        </View>
      </View>

      <View style={[a.flex_row, a.align_center, a.justify_end, a.gap_lg]}>
        {error && (
          <Text
            style={[
              a.flex_1,
              a.italic,
              a.leading_snug,
              t.atoms.text_contrast_medium,
            ]}>
            <Trans>
              There was an issue sending your report. Please check your internet
              connection.
            </Trans>
          </Text>
        )}

        <Button
          testID="sendReportBtn"
          size="large"
          variant="solid"
          color="negative"
          label={_(msg`Send report`)}
          onPress={() => submit()}>
          <ButtonText>
            <Trans>Send report</Trans>
          </ButtonText>
          {submitting && <ButtonIcon icon={Loader} />}
        </Button>
      </View>
    </View>
  )
}

function PreviewMessage({message}: {message: ChatBskyConvoDefs.MessageView}) {
  const t = useTheme()
  const rt = useMemo(() => {
    return new RichTextAPI({text: message.text, facets: message.facets})
  }, [message.text, message.facets])

  return (
    <View style={a.align_start}>
      <View
        style={[
          a.py_sm,
          a.my_2xs,
          a.rounded_md,
          {
            paddingLeft: 14,
            paddingRight: 14,
            backgroundColor: t.palette.contrast_50,
            borderRadius: 17,
          },
          {borderBottomLeftRadius: 2},
        ]}>
        <RichText
          value={rt}
          style={[a.text_md, a.leading_snug]}
          interactiveStyle={a.underline}
          enableTags
        />
      </View>
      <MessageItemMetadata
        item={{
          type: 'message',
          message,
          key: '',
          nextMessage: null,
        }}
        style={[a.text_left, a.mb_0]}
      />
    </View>
  )
}
