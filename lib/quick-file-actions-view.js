module.exports = function (disposeAction) {
  var element, input;

  return {
    destroy: function () {
      element && element.remove();
    },

    focus: function () {
      input.focus();
      input.getModel().scrollToScreenPosition([0, 10000]);
    },

    getElement: function (text, fileOps, callback) {
      element = document.createElement('form');
      input = document.createElement('atom-text-editor');
      var label = document.createElement('label');

      atom.commands.add(element, {
        'core:confirm': function (event) {
          var newPath = event.target.closest('atom-text-editor').getModel().getText();
          return callback(fileOps, newPath);
        },
        'core:cancel': function (event) {
          return disposeAction();
        }
      });

      label.textContent = text;

      input.setAttribute('mini', true);
      input.getModel().setText(fileOps.relativeToProject());
      // setTimeout here as when not present it messes up the order of things
      // and throws exceptions.
      input.onblur = function () { window.setTimeout(disposeAction, 1) };

      element.appendChild(label);
      element.appendChild(input);

      return element;
    }
  };
};
