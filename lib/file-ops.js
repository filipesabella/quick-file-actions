var fsPlus = require('fs-plus');
var fsExtra = require('fs-extra');
var util = require('./util');
var pathLib = require('path');
var shell = require('electron').shell;

module.exports = function fileOpsFromAsbolute(originalPath) {
  var originalRelativePath = atom.project.relativizePath(originalPath)[1];
  var root = originalPath.replace(originalRelativePath, '');

  var absolutise = pathLib.resolve.curry(root);

  function confirming(configKey, message, action) {
    if (atom.config.get(configKey) == true) {
      atom.confirm({
        message: message,
        buttons: {
          Yes: action,
          Cancel: util.identity
        }
      });
    } else {
      action();
    }
  }

  function checkingDestination(relativeNewPath, action) {
    if (originalRelativePath == relativeNewPath) return;

    var newPath = absolutise(relativeNewPath);
    if (fsPlus.existsSync(newPath)) {
      confirming('quick-file-actions.confirmOnReplace', 'Destination path already exists, override?', action.curry(newPath));
    } else {
      action(newPath);
    }
  }

  return {
    relativeToProject: function () { return originalRelativePath; },

    move: function (relativeNewPath) {
      checkingDestination(relativeNewPath, function (newPath) {
        fsExtra.move(originalPath, newPath, { clobber: true }, util.identity);
      });
    },

    copy: function (relativeNewPath) {
      checkingDestination(relativeNewPath, function (newPath) {
        fsExtra.copySync(originalPath, newPath);
        atom.workspace.open(newPath);
      });
    },

    remove: function (relativePathToRemove) {
      var pathToRemove = absolutise(relativePathToRemove);

      var moveToTrash = atom.config.get('quick-file-actions.moveToTrash') == true;

      var message = moveToTrash ? 'moving ' + pathToRemove + ' to the trash bin' : 'permanently deleting ' + pathToRemove;
      var deleteFn = moveToTrash ? shell.moveItemToTrash : fsPlus.removeSync;

      confirming(
        'quick-file-actions.confirmOnDelete',
        'Please confirm ' + message,
        deleteFn.curry(pathToRemove));
    },

    create: function (relativeNewPath) {
      var newPath = absolutise(relativeNewPath);
      fsPlus.writeFileSync(newPath, '');
      atom.workspace.open(newPath);
    }
  }
}
