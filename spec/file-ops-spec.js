var subject = require('../lib/file-ops');
var util = require('../lib/util');

describe('a file ops object', function () {
  var projectRoot = '/users/the-user/quick-file-actions/';
  var absolutePath = '/users/the-user/quick-file-actions/lib/quick-file-actions.js';
  var relativePath = 'lib/quick-file-actions.js';

  var fsPlus = require('fs-plus');
  var fsExtra = require('fs-extra');
  var shell = require('electron').shell;

  beforeEach(function () {
    spyOn(atom.project, 'relativizePath').andReturn([absolutePath, relativePath]);
    spyOn(atom.workspace, 'open');
    spyOn(fsPlus, 'writeFileSync');
    spyOn(fsPlus, 'removeSync');
    spyOn(fsExtra, 'move');
    spyOn(fsExtra, 'copySync');
    spyOn(shell, 'moveItemToTrash');
  });

  afterEach(function () {
    expect(atom.project.relativizePath).toHaveBeenCalledWith(absolutePath);
  });

  it('returns the a path relative to the project', function () {
    var fileOps = subject(absolutePath);

    expect(fileOps.relativeToProject()).toBe('lib/quick-file-actions.js')
  });

  it('creates a new file', function () {
    var fileToCreate = 'lib/a-new-file';
    var fileOps = subject(absolutePath);
    fileOps.create(fileToCreate);

    var expectedNewPath = projectRoot + fileToCreate;
    expect(fsPlus.writeFileSync).toHaveBeenCalledWith(expectedNewPath, '');
    expect(atom.workspace.open).toHaveBeenCalledWith(expectedNewPath);
  });

  describe('when removing files', function () {
    var fileToRemove = 'lib/file-to-remove';

    describe('when it is configured to delete files permanently', function () {
      beforeEach(function () {
        atom.config.set('quick-file-actions.moveToTrash', false);
      });

      it('does not confirm if not configured', function () {
        subject(absolutePath).remove(fileToRemove);

        var pathToRemove = projectRoot + fileToRemove;
        expect(fsPlus.removeSync).toHaveBeenCalledWith(pathToRemove);
      });

      describe('when configured to confirm', function () {
        beforeEach(function () {
          atom.config.set('quick-file-actions.confirmOnDelete', true)
        });

        it('does not delete when not confirming', function () {
          atom.confirm = util.identity;
          subject(absolutePath).remove(fileToRemove);
          expect(fsPlus.removeSync).not.toHaveBeenCalled();
        });

        it('deletes when confirming', function () {
          atom.confirm = function (opts) { opts.buttons['Yes'](); };
          subject(absolutePath).remove(fileToRemove);
          expect(fsPlus.removeSync).toHaveBeenCalledWith(projectRoot + fileToRemove);
        });
      })
    });

    describe('when it is configured to move files to the trash bin', function () {
      beforeEach(function () {
        atom.config.set('quick-file-actions.moveToTrash', true);
      });

      it('does not confirm if not configured', function () {
        subject(absolutePath).remove(fileToRemove);

        var pathToRemove = projectRoot + fileToRemove;
        expect(shell.moveItemToTrash).toHaveBeenCalledWith(pathToRemove);
      });

      describe('when configured to confirm', function () {
        beforeEach(function () {
          atom.config.set('quick-file-actions.confirmOnDelete', true);
        });

        it('does not delete when not confirming', function () {
          atom.confirm = util.identity;
          subject(absolutePath).remove(fileToRemove);
          expect(shell.moveItemToTrash).not.toHaveBeenCalled();
        });

        it('deletes when confirming', function () {
          atom.confirm = function (opts) { opts.buttons['Yes'](); };
          subject(absolutePath).remove(fileToRemove);
          expect(shell.moveItemToTrash).toHaveBeenCalledWith(projectRoot + fileToRemove);
        });
      })
    });
  });

  describe('when moving files', function () {
    var fileToMove = 'lib/file-to-move';
    var pathToMove = projectRoot + fileToMove;

    describe('when the target file does not exist', function () {
      it('moves the file', function () {
        subject(absolutePath).move(fileToMove);

        expect(fsExtra.move).toHaveBeenCalledWith(absolutePath, pathToMove, { clobber: true }, util.identity);
      });
    });

    describe('when the destination is the same as the original', function () {
      it('does nothing', function () {
        subject(absolutePath).copy(relativePath);
        expect(fsExtra.move).not.toHaveBeenCalled();
      });
    });

    describe('when the target file already exists', function () {
      beforeEach(function () {
        spyOn(fsPlus, 'existsSync').andReturn(true);
      });

      afterEach(function () {
        expect(fsPlus.existsSync).toHaveBeenCalledWith(pathToMove);
      });

      describe('when not configure do confirm', function () {
        it('moves the file', function () {
          subject(absolutePath).move(fileToMove);

          expect(fsExtra.move).toHaveBeenCalledWith(absolutePath, pathToMove, { clobber: true }, util.identity);
        });
      });

      describe('when configured to confirm', function () {
        beforeEach(function () {
          atom.config.set('quick-file-actions.confirmOnReplace', true)
        });

        it('does not move the file when not confirming', function () {
          atom.confirm = util.identity;
          subject(absolutePath).move(fileToMove);
          expect(fsExtra.move).not.toHaveBeenCalled();
        });

        it('moves the file when confirming', function () {
          atom.confirm = function (opts) { opts.buttons['Yes'](); };
          subject(absolutePath).move(fileToMove);
          expect(fsExtra.move).toHaveBeenCalledWith(absolutePath, pathToMove, { clobber: true }, util.identity);
        });
      });
    });
  });

  describe('when copying files', function () {
    var fileToCopy = 'lib/file-to-copy';
    var pathToCopy = projectRoot + fileToCopy;

    describe('when the target file does not exist', function () {
      it('copies the file', function () {
        subject(absolutePath).copy(fileToCopy);

        expect(fsExtra.copySync).toHaveBeenCalledWith(absolutePath, pathToCopy);
        expect(atom.workspace.open).toHaveBeenCalledWith(pathToCopy);
      });
    });

    describe('when the destination is the same as the original', function () {
      it('does nothing', function () {
        subject(absolutePath).copy(relativePath);
        expect(fsExtra.copySync).not.toHaveBeenCalled();
      });
    });

    describe('when the target file already exists', function () {
      beforeEach(function () {
        spyOn(fsPlus, 'existsSync').andReturn(true);
      });

      afterEach(function () {
        expect(fsPlus.existsSync).toHaveBeenCalledWith(pathToCopy);
      });

      describe('when not configure do confirm', function () {
        it('copies the file', function () {
          subject(absolutePath).copy(fileToCopy);

          expect(fsExtra.copySync).toHaveBeenCalledWith(absolutePath, pathToCopy);
          expect(atom.workspace.open).toHaveBeenCalledWith(pathToCopy);
        });
      });

      describe('when configured to confirm', function () {
        beforeEach(function () {
          atom.config.set('quick-file-actions.confirmOnReplace', true)
        });

        it('does not move the file when not confirming', function () {
          atom.confirm = util.identity;
          subject(absolutePath).copy(fileToCopy);
          expect(fsExtra.copySync).not.toHaveBeenCalled();
        });

        it('copies the file when confirming', function () {
          atom.confirm = function (opts) { opts.buttons['Yes'](); };
          subject(absolutePath).copy(fileToCopy);
          expect(fsExtra.copySync).toHaveBeenCalledWith(absolutePath, pathToCopy);
          expect(atom.workspace.open).toHaveBeenCalledWith(pathToCopy);
        });
      });
    });
  });
});
