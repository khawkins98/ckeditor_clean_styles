/* eslint-disable max-classes-per-file */
/**
 * @file
 * CKEditor 5 Clean Text Styles plugin - Build-free version.
 *
 * This plugin removes unwanted text formatting artifacts from pasted content.
 * Removes inline styles, document-specific classes, attributes, and &nbsp; entities.
 */

(function (global, factory) {
  if (typeof exports === "object" && typeof module === "object") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    global.CKEditor5 = global.CKEditor5 || {};
    global.CKEditor5.cleanTextStyles = factory();
  }
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
    ? window
    : this,
  function () {
    /**
     * Configuration for text formatting artifact cleanup.
     */
    const CONFIG = {
      WORD_CLASSES: [
        "OutlineElement",
        "Ltr",
        "SCXW",
        "BCX",
        "ListContainerWrapper",
        "NormalTextRun",
        "EOP",
        "Paragraph",
        "MsoNormal",
        "MsoListParagraph",
        "MsoBodyText",
      ],
      WORD_ATTRIBUTES: ["id", "paraid", "paraeid"],
    };

    /**
     * Clean Text Styles plugin for CKEditor 5.
     */
    class CleanTextStyles extends globalThis.CKEditor5.core.Plugin {
      /**
       * @inheritdoc
       */
      static get pluginName() {
        return "CleanTextStyles";
      }

      /**
       * @inheritdoc
       */
      init() {
        const { editor } = this;
        const { t } = editor;

        // Add the clean text styles command
        editor.commands.add(
          "cleanTextStyles",
          new CleanTextStylesCommand(editor)
        );

        // Add the button to the toolbar
        editor.ui.componentFactory.add("cleanTextStyles", function (locale) {
          const command = editor.commands.get("cleanTextStyles");
          const buttonView = new globalThis.CKEditor5.ui.ButtonView(locale);

          buttonView.set({
            label: t("Clean Text Styles"),
            tooltip: true,
          });

          // Execute command when the button is clicked
          buttonView.on("execute", function () {
            editor.execute("cleanTextStyles");
            editor.editing.view.focus();
          });

          // Bind button state to command
          buttonView.bind("isEnabled").to(command);

          return buttonView;
        });
      }
    }

    /**
     * Clean Text Styles command.
     */
    class CleanTextStylesCommand extends globalThis.CKEditor5.core.Command {
      constructor(editor) {
        super(editor);
      }

      /**
       * Executes the command - cleans text formatting artifacts from editor content.
       */
      execute() {
        const editor = this.editor;
        const selection = editor.model.document.selection;

        // If there is a non-collapsed selection, clean only the selected content.
        if (!selection.isCollapsed) {
          try {
            const modelFragment = editor.model.getSelectedContent(selection);

            // Prefer using DataController.stringify when available to serialize the model fragment.
            let selectedHtml = null;
            if (
              editor.data &&
              typeof editor.data.stringify === "function"
            ) {
              selectedHtml = editor.data.stringify(modelFragment);
            }

            if (typeof selectedHtml === "string") {
              const cleanedSelected = this._cleanTextStyles(selectedHtml);

              if (cleanedSelected !== selectedHtml) {
                const viewFragment = editor.data.processor.toView(cleanedSelected);
                const modelClean = editor.data.toModel(viewFragment);

                editor.model.change(() => {
                  // Replace the current selection with cleaned content.
                  editor.model.deleteContent(selection);
                  editor.model.insertContent(modelClean);
                });
              }

              return; // Done handling selection case.
            }
            // If we cannot serialize selection, fall through to full document cleanup.
          } catch (e) {
            // On any error, fall back to full document cleanup below.
          }
        }

        // Fallback: clean the entire editor content.
        const currentData = editor.getData();
        const cleanedData = this._cleanTextStyles(currentData);
        if (cleanedData !== currentData) {
          editor.setData(cleanedData);
        }
      }

      /**
       * Cleans text formatting artifacts from raw HTML string.
       *
       * @param {string} html - The HTML string to clean
       * @return {string} - The cleaned HTML string
       */
      _cleanTextStyles(html) {
        if (!html || typeof html !== "string") {
          return html;
        }

        try {
          // Create a temporary container to parse HTML
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;

          // Clean all elements
          const allElements = tempDiv.querySelectorAll("*");
          for (let i = 0; i < allElements.length; i++) {
            this._cleanHtmlElement(allElements[i]);
          }

          // Return cleaned HTML with non-breaking spaces normalized
          return tempDiv.innerHTML.replace(/(?:&nbsp;|\u00A0)/g, " ");
        } catch (error) {
          return html; // Return original on error
        }
      }

      /**
       * Cleans a single HTML DOM element.
       *
       * @param {Element} element - The DOM element to clean
       * @return {boolean} - True if any changes were made
       */
      _cleanHtmlElement(element) {
        let changed = false;

        // Remove ALL inline styles (aggressive cleaning)
        if (element.hasAttribute("style")) {
          element.removeAttribute("style");
          changed = true;
        }

        // Clean class attribute
        if (element.hasAttribute("class")) {
          const originalClasses = element.getAttribute("class");
          const cleanedClasses = this._cleanClasses(originalClasses);

          if (cleanedClasses !== originalClasses) {
            if (cleanedClasses.trim() === "") {
              element.removeAttribute("class");
            } else {
              element.setAttribute("class", cleanedClasses);
            }
            changed = true;
          }
        }

        // Remove Word-specific attributes (excluding class and style which we handle above)
        for (let i = 0; i < CONFIG.WORD_ATTRIBUTES.length; i++) {
          const attr = CONFIG.WORD_ATTRIBUTES[i];
          if (element.hasAttribute(attr)) {
            const value = element.getAttribute(attr);
            if (this._isWordSpecificValue(attr, value)) {
              element.removeAttribute(attr);
              changed = true;
            }
          }
        }

        return changed;
      }

      /**
       * Checks if an attribute value is Word-specific.
       *
       * @param {string} attribute - The attribute name
       * @param {string} value - The attribute value
       * @return {boolean} - True if the value is Word-specific
       */
      _isWordSpecificValue(attribute, value) {
        if (!value || typeof value !== "string") {
          return false;
        }

        switch (attribute) {
          case "id":
            return (
              /^(OLE_LINK|_Toc|_Ref)\d*$/.test(value) ||
              value.includes("Word") ||
              value.includes("Office")
            );

          case "paraid":
          case "paraeid":
            return true;

          default:
            return false;
        }
      }

      /**
       * Cleans class attribute values by removing Word-specific classes.
       *
       * @param {string} classString - The class attribute value
       * @return {string} - The cleaned class string
       */
      _cleanClasses(classString) {
        if (!classString || typeof classString !== "string") {
          return "";
        }

        const classes = classString.split(/\s+/);
        const cleanedClasses = [];

        for (let i = 0; i < classes.length; i++) {
          const cls = classes[i];
          if (!cls.trim()) {
            continue;
          }

          let isWordClass = false;
          for (let j = 0; j < CONFIG.WORD_CLASSES.length; j++) {
            if (cls.includes(CONFIG.WORD_CLASSES[j])) {
              isWordClass = true;
              break;
            }
          }

          if (!isWordClass) {
            cleanedClasses.push(cls);
          }
        }

        return cleanedClasses.join(" ");
      }
    }

    // Export the plugin
    return {
      CleanTextStyles,
    };
  }
);
