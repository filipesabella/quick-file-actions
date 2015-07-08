var QuickFileActionsView = require('./quick-file-actions-view');
var CompositeDisposable = require('atom').CompositeDisposable;
var fs_plus = require('fs-plus');
var fs_extra = require('fs-extra');

module.exports = QuickFileActions = (function () {
  var subscriptions = new CompositeDisposable();
  var quickFileActionsView = new QuickFileActionsView(disposeAction);
  var modalPanel;
  var identity = function (e) { return e; };

  function disposeAction() {
    modalPanel && modalPanel.destroy();
    atom.workspace.getActivePane().activate();
  }

  function withDispose(fn) {
    return function (oldPath, newPath) {
      fn(oldPath, newPath);
      disposeAction();
    }
  }

  function showModalWith(callback, textFn, pathTransformingFn) {
    return function () {
      pathTransformingFn = pathTransformingFn || identity;

      var activePane = atom.workspace.getActivePaneItem();
      path = activePane && activePane.getPath();

      if (!path) return;

      modalPanel = atom.workspace.addModalPanel({
        item: quickFileActionsView.getElement(textFn(path), pathTransformingFn(path), callback),
        visible: true
      });

      quickFileActionsView.focus();
    }
  }

  function move(oldPath, newPath) {
    return fs_plus.moveSync(oldPath, newPath);
  }

  function remove(oldPath, newPath) {
    function doRemove() {
      fs_plus.removeSync(newPath)
    }

    if (atom.config.get('quick-file-actions.confirmOnDelete') == true) {
      atom.confirm({
        message: 'Please confirm deleting ' + newPath,
        buttons: {
          Yes: doRemove,
          Cancel: function () {}
        }
      });
    } else {
      doRemove();
    }
  }

  function copy(oldPath, newPath) {
    if (oldPath == newPath) return;

    function doCopy() {
      fs_extra.copySync(oldPath, newPath);
      atom.workspace.open(newPath);
    }

    if (fs_plus.existsSync(newPath) && atom.config.get('quick-file-actions.confirmOnReplace') == true) {
      atom.confirm({
        message: 'Destination file already exists, override?',
        buttons: {
          Yes: doCopy,
          Cancel: function () {}
        }
      });
    } else {
      doCopy();
    }
  }

  function create(_, newPath) {
    fs_plus.writeFileSync(newPath, '');
    atom.workspace.open(newPath);
  }

  function removeLastBit(path) {
    return path.substring(0, path.lastIndexOf('/') + 1);
  }

  return {
    quickFileActionsView: null,
    modalPanel: null,
    subscriptions: null,

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

    activate: function (state) {
      function addSubscription(action, callback, textFn, pathTransformingFn) {
        subscriptions.add(atom.commands.add(
          'atom-workspace',
          'quick-file-actions:' + action,
          showModalWith(callback, textFn, pathTransformingFn)));

        return addSubscription;
      }

      addSubscription('move',   withDispose(move),   function (path) { return 'Move ' + path + ' to'; })
                     ('copy',   withDispose(copy),   function (path) { return 'Copy ' + path + ' to'; })
                     ('delete', withDispose(remove), function(_) { return 'Path to delete'; })
                     ('new',    withDispose(create), function(_) { return 'New file'; }, removeLastBit);
    },

    deactivate: function () {
      modalPanel && modalPanel.destroy();
      subscriptions && subscriptions.dispose();
      quickFileActionsView && quickFileActionsView.destroy();
    },

    serialize: identity
  };
})();