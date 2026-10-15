/**
 * Job search widget.
 * Renders a keyword + location search form that hands the query off to the
 * Atlas Copco Group (SuccessFactors) job search, pre-filtered on the brand facet.
 * Configured through the authored widget link query params:
 *   /widgets/job-search.html?brand=CP+Chicago+Pneumatic&locale=en_US
 * @param {Element} widget The widget element (data-brand, data-locale)
 */
export default function decorate(widget) {
  const form = widget.querySelector('form');
  if (!form) return;

  const { brand, locale } = widget.dataset;
  if (locale && form.elements.locale) form.elements.locale.value = locale;
  if (form.elements.facetFilters) {
    if (brand) {
      form.elements.facetFilters.value = JSON.stringify({ filter1: [brand] });
    } else {
      form.elements.facetFilters.remove();
    }
  }

  // unique ids so several widgets can live on one page
  const suffix = Math.random().toString(36).slice(2, 8);
  form.querySelectorAll('label[for]').forEach((label) => {
    const input = form.querySelector(`#${label.htmlFor}`);
    if (!input) return;
    const id = `${input.id}-${suffix}`;
    input.id = id;
    label.htmlFor = id;
  });
}
