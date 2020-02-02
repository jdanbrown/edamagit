import { workspace, extensions, commands, ExtensionContext, Disposable, languages, window, TextEditor } from 'vscode';
import ContentProvider from './providers/contentProvider';
import { GitExtension, API } from './typings/git';
import { pushing } from './commands/pushingCommands';
import { branching } from './commands/branchingCommands';
import { magitHelp } from './commands/helpCommands';
import { magitStatus, magitRefresh } from './commands/statusCommands';
import { magitVisitAtPoint } from './commands/visitAtPointCommands';
import { MagitRepository } from './models/magitRepository';
import { magitCommit } from './commands/commitCommands';
import { magitStage, magitStageAll, magitUnstageAll, magitUnstage } from './commands/stagingCommands';
import { saveClose } from './commands/macros';
import HighlightProvider from './providers/highlightProvider';
import { Command } from './commands/commandPrimer';
import * as Constants from './common/constants';
import { fetching } from './commands/fetchingCommands';
import { pulling } from './commands/pullingCommands';
import { stashing } from './commands/stashingCommands';
import { DocumentView } from './views/general/documentView';
import { magitApplyEntityAtPoint } from './commands/applyCommands';
import { magitDiscardAtPoint } from './commands/discardCommands';
import { merging } from './commands/mergingCommands';
import { rebasing } from './commands/rebasingCommands';
import { filePopup } from './commands/filePopupCommands';
import { DispatchView } from './views/dispatchView';
import MagitUtils from './utils/magitUtils';

export const magitRepositories: Map<string, MagitRepository> = new Map<string, MagitRepository>();
export const views: Map<string, DocumentView> = new Map<string, DocumentView>();

export let gitApi: API;

export function activate(context: ExtensionContext) {

  const gitExtension = extensions.getExtension<GitExtension>('vscode.git')!.exports;
  if (!gitExtension.enabled) {
    throw new Error('vscode.git Git extension not enabled');
  }

  context.subscriptions.push(gitExtension.onDidChangeEnablement(enabled => {
    if (!enabled) {
      throw new Error('vscode.git Git extension was disabled');
    }
  }));

  gitApi = gitExtension.getAPI(1);

  const contentProvider = new ContentProvider();
  const highlightProvider = new HighlightProvider();

  const providerRegistrations = Disposable.from(
    workspace.registerTextDocumentContentProvider(Constants.MagitUriScheme, contentProvider),
    languages.registerDocumentHighlightProvider(Constants.MagitDocumentSelector, highlightProvider)
  );
  context.subscriptions.push(
    contentProvider,
    providerRegistrations,
  );

  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit', (editor: TextEditor) => magitStatus(editor)));
  context.subscriptions.push(commands.registerCommand('extension.magit-help', magitHelp));

  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-commit', Command.primeRepo(magitCommit)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-refresh', Command.primeRepo(magitRefresh)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-pulling', Command.primeRepo(pulling)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-pushing', Command.primeRepo(pushing)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-stashing', Command.primeRepo(stashing)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-fetching', Command.primeRepo(fetching)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-branching', Command.primeRepo(branching)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-merging', Command.primeRepo(merging)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-rebasing', Command.primeRepo(rebasing)));

  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-visit-at-point', Command.primeRepoAndView(magitVisitAtPoint, false)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-apply-at-point', Command.primeRepoAndView(magitApplyEntityAtPoint)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-discard-at-point', Command.primeRepoAndView(magitDiscardAtPoint)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-stage', Command.primeRepoAndView(magitStage)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-stage-all', Command.primeRepoAndView(magitStageAll)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-unstage', Command.primeRepoAndView(magitUnstage)));
  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-unstage-all', Command.primeRepoAndView(magitUnstageAll)));

  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-file-popup', Command.primeFileCommand(filePopup)));

  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-dispatch', Command.primeRepo(async (repository: MagitRepository) => {
    const uri = DispatchView.encodeLocation(repository);
    views.set(uri.toString(), new DispatchView(uri));
    return workspace.openTextDocument(uri).then(doc => window.showTextDocument(doc, { viewColumn: MagitUtils.oppositeActiveViewColumn(), preview: false }));
  }, false)));

  context.subscriptions.push(commands.registerTextEditorCommand('extension.magit-toggle-fold', Command.primeRepoAndView(async (repo: MagitRepository, view: DocumentView) => {
    const selectedView = view.click(window.activeTextEditor!.selection.active);

    if (selectedView?.isFoldable) {
      selectedView.folded = !selectedView.folded;
      view.triggerUpdate();
    }
  }, false)));

  context.subscriptions.push(commands.registerCommand('extension.magit-save-and-close-commit-msg', saveClose));
}

export function deactivate() {
  // MINOR: clean up? views, repositories etc??
}
