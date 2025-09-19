CKEditor Clean Styles for Drupal
================================

Provides a CKEditor 5 toolbar button for Drupal 10 and 11, labeled "Clean Text Styles", that removes unwanted text formatting artifacts from pasted content. It removes inline styles, Word-specific classes and attributes, and normalizes non‑breaking spaces.

As of September 2025 there is still no good way to this in Drupal; see: https://www.drupal.org/project/drupal/issues/3321254

Requirements
------------

- Drupal core 10 or 11 (core_version_requirement: ^10 || ^11)
- CKEditor 5 module (dependency: drupal:ckeditor5)

Installation
------------

Install as you would normally install a contributed Drupal module.

- With Drush:
  - `drush en ckeditor_clean_styles -y`
- Using DDEV (optional):
  - `ddev drush en ckeditor_clean_styles -y`

Configuration
-------------

1. Go to `Administration » Configuration » Content authoring » Text formats and editors`.
    - `/admin/config/content/formats`
2. Edit the text format where the button should be available (e.g. `Full HTML`).
3. In the CKEditor 5 toolbar builder, drag the "Clean Text Styles" button from Available buttons into the toolbar.
4. Save configuration.

Usage
-----

- Click the "Clean Text Styles" button in the editor toolbar to clean the current content.
- If a non-collapsed selection exists, only the selected content is cleaned; otherwise the entire editor content is cleaned:
  - Removes all inline `style` attributes
  - Removes document-specific CSS classes (e.g., `MsoNormal`, `SCXW`, `BCX`, etc.)
  - Removes document attributes such as `paraid`, `paraeid`, and certain `id` values used by Word
  - Replaces `&nbsp;` (and U+00A0) with regular spaces

Development
-----------

This plugin is intentionally build-free (no webpack, no npm dependencies). The CKEditor plugin is a small UMD bundle.

Workflow:

1. Edit `js/cleanTextStyles.js` directly
2. Clear Drupal caches: `drush cr` (or `ddev drush cr`)
3. Test in the editor

License
-------

GPL-2.0-or-later
