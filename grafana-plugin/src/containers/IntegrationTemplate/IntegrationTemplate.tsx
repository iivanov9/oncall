import React, { useCallback, useState, useEffect } from 'react';

import { Button, HorizontalGroup, Drawer, VerticalGroup, Icon } from '@grafana/ui';
import cn from 'classnames/bind';
import { debounce } from 'lodash-es';
import { observer } from 'mobx-react';

import { TemplateForEdit } from 'components/AlertTemplates/CommonAlertTemplatesForm.config';
import CheatSheet from 'components/CheatSheet/CheatSheet';
import {
  groupingTemplateCheatSheet,
  slackMessageTemplateCheatSheet,
  genericTemplateCheatSheet,
} from 'components/CheatSheet/CheatSheet.config';
import Block from 'components/GBlock/Block';
import MonacoEditor from 'components/MonacoEditor/MonacoEditor';
import Text from 'components/Text/Text';
import TemplatePreview from 'containers/TemplatePreview/TemplatePreview';
import TemplatesAlertGroupsList from 'containers/TemplatesAlertGroupsList/TemplatesAlertGroupsList';
import { WithPermissionControlTooltip } from 'containers/WithPermissionControl/WithPermissionControlTooltip';
import { AlertReceiveChannel } from 'models/alert_receive_channel/alert_receive_channel.types';
import { AlertTemplatesDTO } from 'models/alert_templates';
import { Alert } from 'models/alertgroup/alertgroup.types';
import { ChannelFilter } from 'models/channel_filter/channel_filter.types';
import { waitForElement } from 'utils/DOM';
import LocationHelper from 'utils/LocationHelper';
import { UserActions } from 'utils/authorization';

import styles from './IntegrationTemplate.module.scss';

const cx = cn.bind(styles);

interface IntegrationTemplateProps {
  id: AlertReceiveChannel['id'];
  channelFilterId?: ChannelFilter['id'];
  template: TemplateForEdit;
  templateBody: string;
  templates: AlertTemplatesDTO[];
  onHide: () => void;
  onUpdateTemplates: (values: any) => void;
  onUpdateRoute: (values: any, channelFilterId?: ChannelFilter['id']) => void;
}

const IntegrationTemplate = observer((props: IntegrationTemplateProps) => {
  const { id, onHide, template, onUpdateTemplates, onUpdateRoute, templateBody, channelFilterId, templates } = props;

  const [isCheatSheetVisible, setIsCheatSheetVisible] = useState<boolean>(false);
  const [chatOpsPermalink, setChatOpsPermalink] = useState(undefined);
  const [alertGroupPayload, setAlertGroupPayload] = useState<JSON>(undefined);
  const [changedTemplateBody, setChangedTemplateBody] = useState<string>(templateBody);
  const [resultError, setResultError] = useState<string>(undefined);
  const [editorHeight, setEditorHeight] = useState<string>(undefined);

  useEffect(() => {
    const locationParams: any = { template: template.name };
    if (template.isRoute) {
      locationParams.routeId = channelFilterId;
    }
    LocationHelper.update(locationParams, 'partial');
  }, []);

  useEffect(() => {
    waitForElement('#content-container-id').then(() => {
      const mainDiv = document.getElementById('content-container-id');
      const height = mainDiv?.getBoundingClientRect().height - 59;
      setEditorHeight(`${height}px`);
    });
  }, []);

  const onShowCheatSheet = useCallback(() => {
    setIsCheatSheetVisible(true);
  }, []);

  const onCloseCheatSheet = useCallback(() => {
    setIsCheatSheetVisible(false);
  }, []);

  const getChangeHandler = () => {
    return debounce((value: string) => {
      setChangedTemplateBody(value);
    }, 500);
  };

  const onEditPayload = (alertPayload: string) => {
    if (alertPayload !== null) {
      try {
        const jsonPayload = JSON.parse(alertPayload);
        if (typeof jsonPayload === 'object') {
          setResultError(undefined);
          setAlertGroupPayload(JSON.parse(alertPayload));
        } else {
          setResultError('Please check your JSON format');
        }
      } catch (e) {
        setResultError(e.message);
      }
    } else {
      setResultError(undefined);
      setAlertGroupPayload(undefined);
    }
  };

  const onSelectAlertGroup = useCallback((alertGroup: Alert) => {
    if (template.additionalData?.chatOpsName) {
      setChatOpsPermalink({
        permalink: alertGroup?.permalinks[template.additionalData?.chatOpsName],
      });
    }
  }, []);

  const onSaveAndFollowLink = useCallback(
    (link: string) => {
      onUpdateTemplates({ [template.name]: changedTemplateBody });
      window.open(link, '_blank');
    },
    [onUpdateTemplates, onUpdateRoute, changedTemplateBody]
  );

  const handleSubmit = useCallback(() => {
    if (template.isRoute) {
      onUpdateRoute({ [template.name]: changedTemplateBody }, channelFilterId);
      onHide();
    } else {
      onUpdateTemplates({ [template.name]: changedTemplateBody });
      onHide();
    }
  }, [onUpdateTemplates, changedTemplateBody]);

  const getCheatSheet = (templateName) => {
    switch (templateName) {
      case 'Grouping':
      case 'Autoresolve':
        return groupingTemplateCheatSheet;
      case 'Web title':
      case 'Web message':
      case 'Web image':
        return genericTemplateCheatSheet;
      case 'Auto acknowledge':
      case 'Source link':
      case 'Phone call':
      case 'SMS':
      case 'Slack title':
      case 'Slack message':
      case 'Slack image':
      case 'Telegram title':
      case 'Telegram message':
      case 'Telegram image':
      case 'Email title':
      case 'Email message':
        return slackMessageTemplateCheatSheet;
      default:
        return genericTemplateCheatSheet;
    }
  };
  return (
    <Drawer
      title={
        <div className={cx('title-container')}>
          <HorizontalGroup justify="space-between" align="flex-start">
            <VerticalGroup>
              <Text.Title level={3}>Edit {template.displayName} template</Text.Title>
              {template.description && <Text type="secondary">{template.description}</Text>}
            </VerticalGroup>

            <HorizontalGroup>
              <WithPermissionControlTooltip userAction={UserActions.IntegrationsWrite}>
                <Button variant="secondary" onClick={onHide}>
                  Cancel
                </Button>
              </WithPermissionControlTooltip>
              <WithPermissionControlTooltip userAction={UserActions.IntegrationsWrite}>
                <Button variant="primary" onClick={handleSubmit}>
                  Save
                </Button>
              </WithPermissionControlTooltip>
            </HorizontalGroup>
          </HorizontalGroup>
        </div>
      }
      onClose={onHide}
      closeOnMaskClick={false}
      width={'95%'}
    >
      <div className={cx('container-wrapper')}>
        <div className={cx('container')} id={'content-container-id'}>
          <TemplatesAlertGroupsList
            alertReceiveChannelId={id}
            onEditPayload={onEditPayload}
            onSelectAlertGroup={onSelectAlertGroup}
            templates={templates}
          />
          {isCheatSheetVisible ? (
            <CheatSheet
              cheatSheetName={template.displayName}
              cheatSheetData={getCheatSheet(template.displayName)}
              onClose={onCloseCheatSheet}
            />
          ) : (
            <>
              <div className={cx('template-block-codeeditor')}>
                <div className={cx('template-editor-block-title')}>
                  <HorizontalGroup justify="space-between" wrap>
                    <Text>Template editor</Text>

                    <Button variant="secondary" fill="outline" onClick={onShowCheatSheet} icon="book" size="sm">
                      Cheatsheat
                    </Button>
                  </HorizontalGroup>
                </div>
                <div className={cx('template-editor-block-content')}>
                  <MonacoEditor
                    value={changedTemplateBody}
                    data={templates}
                    showLineNumbers={true}
                    height={editorHeight}
                    onChange={getChangeHandler()}
                  />
                </div>
              </div>
            </>
          )}
          <Result
            alertReceiveChannelId={id}
            template={template}
            templateBody={changedTemplateBody}
            alertGroup={undefined}
            chatOpsPermalink={chatOpsPermalink}
            payload={alertGroupPayload}
            error={resultError}
            onSaveAndFollowLink={onSaveAndFollowLink}
          />
        </div>
      </div>
    </Drawer>
  );
});

interface ResultProps {
  alertReceiveChannelId: AlertReceiveChannel['id'];
  // templateName: string;
  templateBody: string;
  template: TemplateForEdit;
  alertGroup?: Alert;
  chatOpsPermalink?: string;
  payload?: JSON;
  error?: string;
  onSaveAndFollowLink?: (link: string) => void;
}

const Result = (props: ResultProps) => {
  const { alertReceiveChannelId, template, templateBody, chatOpsPermalink, payload, error, onSaveAndFollowLink } =
    props;

  const getCapitalizedChatopsName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  return (
    <div className={cx('template-block-result')}>
      <div className={cx('template-block-title')}>
        <HorizontalGroup justify="space-between">
          <Text>Result</Text>
        </HorizontalGroup>
      </div>
      <div className={cx('result')}>
        {payload || error ? (
          <VerticalGroup spacing="lg">
            {error ? (
              <Block bordered fullWidth withBackground>
                <Text>{error}</Text>
              </Block>
            ) : (
              <Block bordered fullWidth withBackground>
                <TemplatePreview
                  key={template.name}
                  templateName={template.name}
                  templateBody={templateBody}
                  alertReceiveChannelId={alertReceiveChannelId}
                  payload={payload}
                />
              </Block>
            )}

            {template?.additionalData?.additionalDescription && (
              <Text type="secondary">{template?.additionalData.additionalDescription}</Text>
            )}

            {template?.additionalData?.chatOpsName && (
              <VerticalGroup>
                <Button onClick={() => onSaveAndFollowLink(chatOpsPermalink)}>
                  <HorizontalGroup spacing="xs" align="center">
                    Save and open Alert Group in {getCapitalizedChatopsName(template.additionalData.chatOpsName)}{' '}
                    <Icon name="external-link-alt" />
                  </HorizontalGroup>
                </Button>

                {template.additionalData.data && <Text type="secondary">{template.additionalData.data}</Text>}
              </VerticalGroup>
            )}
          </VerticalGroup>
        ) : (
          <div>
            <Block bordered fullWidth className={cx('block-style')}>
              <Text>← Select alert group or "Use custom payload"</Text>
            </Block>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationTemplate;
