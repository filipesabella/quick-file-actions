var QuickFileActionsView = require('./quick-file-actions-view');
var CompositeDisposable = require('atom').CompositeDisposable;
var pathLib = require('path');
var util = require('./util');
var fileOpsFromAbsolute = require('./file-ops');

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
      pathTransformingFn = pathTransformingFn || util.identity;

      var activePane = atom.workspace.getActiveTextEditor();
      var possiblePath = activePane && activePane.getPath();

      if (!possiblePath) return;

      var fileOps = fileOpsFromAbsolute(pathTransformingFn(possiblePath));

      modalPanel = atom.workspace.addModalPanel({
        item: quickFileActionsView.getElement(textFn(fileOps.relativeToProject()), fileOps, callback),
        visible: true
      });

      quickFileActionsView.focus();
    }
  }

  function move(fileOps, newPath) {
    return fileOps.move(newPath);
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
      },
      moveToTrash: {
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

    serialize: util.identity
  };
})();
