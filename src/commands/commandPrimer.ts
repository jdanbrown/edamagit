import MagitUtils from '../utils/magitUtils';
import { MagitRepository } from '../models/magitRepository';
import { TextEditor, window, Uri } from 'vscode';
import { DocumentView } from '../views/general/documentView';
import GitTextUtils from '../utils/gitTextUtils';

export class Command {

  // MINOR: this class could maybe use some refactoring?

  static primeRepo(command: (repository: MagitRepository) => Promise<any>, triggersUpdate: boolean = true): (editor: TextEditor) => Promise<any> {

    return async (editor: TextEditor) => {
      const repository = MagitUtils.getCurrentMagitRepo(editor.document);

      if (repository) {

        try {
          await command(repository);
        } catch (error) {
          this.handleError(repository, error);
        } finally {
          if (triggersUpdate) {
            MagitUtils.magitStatusAndUpdate(repository);
          }
        }
      }
    };
  }

  static primeRepoAndView(command: (repository: MagitRepository, view: DocumentView) => Promise<any>, triggersUpdate: boolean = true): (editor: TextEditor) => Promise<any> {

    return async (editor: TextEditor) => {
      const [repository, currentView] = MagitUtils.getCurrentMagitRepoAndView(editor);

      if (repository && currentView) {

        try {
          await command(repository, currentView);
        } catch (error) {
          this.handleError(repository, error);
        } finally {
          if (triggersUpdate) {
            MagitUtils.magitStatusAndUpdate(repository);
          }
        }
      }
    };
  }

  static primeFileCommand(command: (repository: MagitRepository, fileUri: Uri) => Promise<any>, triggersUpdate: boolean = true): (editor: TextEditor) => Promise<any> {
    return async (editor: TextEditor) => {

      const fileUri = editor.document.uri;
      const repository = MagitUtils.getCurrentMagitRepo(editor.document);

      if (repository) {

        try {
          await command(repository, fileUri);
        } catch (error) {
          this.handleError(repository, error);
        } finally {
          if (triggersUpdate) {
            MagitUtils.magitStatusAndUpdate(repository);
          }
        }
      }
    };
  }

  static handleError(repository: MagitRepository, error: any) {
    if (error.gitErrorCode) {
      repository.magitState!.latestGitError = GitTextUtils.formatError(error);
    } else {
      // MINOR: This error type, too heavy for most errors?
      //   statusBar message might be better
      //   but then custom, shorter messages are needed
      window.showErrorMessage(GitTextUtils.formatError(error));
    }
  }
}