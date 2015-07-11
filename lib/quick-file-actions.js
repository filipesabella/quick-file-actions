var QuickFileActionsView = require('./quick-file-actions-view');
var CompositeDisposable = require('atom').CompositeDisposable;
var fsPlus = require('fs-plus');
var fsExtra = require('fs-extra');
var pathLib = require('path');

var identity = function (e) { return e; };

module.exports = (function () {
  var subscriptions = new CompositeDisposable();
  var quickFileActionsView = new QuickFileActionsView(disposeAction);
  var modalPanel;

  function disposeAction() {
    modalPanel && modalPanel.destroy();
    atom.workspace.getActivePane().activate();
  }

  function withDispose(fn) {
    return function (fileOps, newPath) {
      fn(fileOps, newPath);
      disposeAction();
    }
  }

  function showModalWith(callback, textFn, pathTransformingFn) {
    return function () {
      pathTransformingFn = pathTransformingFn || identity;

      var activePane = atom.workspace.getActivePaneItem();
      var possiblePath = activePane && activePane.getPath();

      if (!possiblePath) return;

      var fileOps = fileOpsFromAsbolute(pathTransformingFn(possiblePath));

      modalPanel = atom.workspace.addModalPanel({
        item: quickFileActionsView.getElement(textFn(fileOps.relativeToProject()), fileOps, callback),
        visible: true
      });

      quickFileActionsView.focus();
    }
  }

  function move(fileOps, newPath) {
    return fileOps.moveTo(newPath);
  }

  function remove(fileOps, newPath) {
    return fileOps.remove(newPath);
  }

  function copy(fileOps, newPath) {
    return fileOps.copy(newPath);
  }

  function create(fileOps, newPath) {
    return fileOps.create(newPath);
  }

  function removeLastBit(path) {
    return path.substring(0, path.lastIndexOf(pathLib.sep) + 1);
  }

  return {
    config: {
      confirmOnDelete: {
        type: 'boolean',
        default: true
      },
      confirmOnReplace: {
        type: 'boolean',
        default: true
      }
    },

    activate: function (_) {
      function addSubscription(action, callback, textFn, pathTransformingFn) {
        subscriptions.add(atom.commands.add(
          'atom-workspace',
          'quick-file-actions:' + action,
          showModalWith(callback, textFn, pathTransformingFn)));

        return addSubscription;
      }

      addSubscription('move',   withDispose(move),   function (path) { return 'Move ' + path + ' to:'; })
                     ('copy',   withDispose(copy),   function (path) { return 'Copy ' + path + ' to:'; })
                     ('delete', withDispose(remove), function (_)    { return 'Path to delete:'; })
                     ('new',    withDispose(create), function (_)    { return 'New file:'; }, removeLastBit);
    },

    deactivate: function () {
      modalPanel && modalPanel.destroy();
      subscriptions && subscriptions.dispose();
      quickFileActionsView && quickFileActionsView.destroy();
    },

    serialize: identity
  };
})();

function fileOpsFromAsbolute(originalPath) {
  var originalRelativePath = atom.project.relativizePath(originalPath)[1];
  var root = originalPath.replace(originalRelativePath, '');

  var absolutise = pathLib.resolve.curry(root);

  function confirming(configKey, message, action) {
    if (atom.config.get(configKey) == true) {
      atom.confirm({
        message: message,
        buttons: {
          Yes: action,
          Cancel: identity
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

    moveTo: function (relativeNewPath) {
      checkingDestination(relativeNewPath, function (newPath) {
        fsExtra.move(originalPath, newPath, { clobber: true }, identity);
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

      confirming(
        'quick-file-actions.confirmOnDelete',
        'Please confirm deleting ' + pathToRemove,
        fsPlus.removeSync.curry(pathToRemove));
    },

    create: function (relativeNewPath) {
      var newPath = absolutise(relativeNewPath);
      fsPlus.writeFileSync(newPath, '');
      atom.workspace.open(newPath);
    }
  }
}

Function.prototype.curry = function() {
  var fn = this, args = Array.prototype.slice.call(arguments);
  return function() {
    return fn.apply(this, args.concat(
      Array.prototype.slice.call(arguments)));
  };
};
