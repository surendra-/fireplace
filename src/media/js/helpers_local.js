define('helpers_local',
    ['apps', 'categories', 'compatibility_filtering', 'content-ratings',
     'feed', 'format', 'helpers', 'models', 'nunjucks', 'regions', 'settings',
     'urls', 'user_helpers', 'utils_local', 'z'],
    function(apps, categories, compatibility_filtering, iarc,
             feed, format, base_helpers, models, nunjucks, regions, settings,
             urls, user_helpers, utils_local, z) {
    var filters = nunjucks.require('filters');
    var globals = nunjucks.require('globals');

    // developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
    // toLocaleDateString() is unreliable ; on Firefox Android and FxOS, it
    // will return the date in m/d/Y format, even if you try to pass custom
    // locale and/or options!.
    // To avoid having to ship a full re-implementation, we use
    // Intl.DateTimeFormat(), which is equivalent but only present if the
    // underlying platform has a full implementation, and fall back to Y-m-d.
    // This gives us a pretty date format (e.g. Saturday, February 15, 2014) on
    // desktop, and leaves something somewhat universal on phones (2014-02-15).
    var dateFormat;
    if (typeof Intl !== 'undefined' &&
        typeof Intl.DateTimeFormat !== 'undefined') {
        var formatting = Intl.DateTimeFormat(user_helpers.lang(), {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        dateFormat = formatting.format.bind(formatting);
    } else {
        dateFormat = function(date) {
            return [
                date.getFullYear(),
                padDate(date.getMonth() + 1),
                padDate(date.getDate()),
            ].join('-');
        };
    }

    function padDate(d) {
        return (d < 10) ? '0' + d : d;
    }

    var rewriteCdnUrlMappings = [
        {
            name: 'Privacy Policy',
            pattern: /\/media\/docs\/privacy\/.+\.html/g,
            replacement: '/privacy-policy'
        },
        {
            name: 'Terms of Use',
            pattern: /\/media\/docs\/terms\/.+\.html/g,
            replacement: '/terms-of-use'
        }
    ];

    /* Register filters. */
    filters.date = function(date) {
        return dateFormat(new Date(date));
    };

    filters.json = JSON.stringify;
    if (nunjucks.env) {
        // For damper when rendering templates outside builder.
        nunjucks.env.addFilter('json', JSON.stringify);
    }

    filters.items = utils_local.items;

    filters.rewriteCdnUrls = function(text){
        // When we get a page back from legal docs stored on the CDN, we
        // need to rewrite them to work locally within a packaged version
        // of Marketplace.
        var rewriteCdnUrlMappings = [
            {
                name: 'Privacy Policy',
                pattern: /\/media\/docs\/privacy\/.+\.html/g,
                replacement: '/privacy-policy'
            },
            {
                name: 'Terms of Use',
                pattern: /\/media\/docs\/terms\/.+\.html/g,
                replacement: '/terms-of-use'
            }
        ];
        rewriteCdnUrlMappings.forEach(function(mapping){
            text = text.replace(mapping.pattern, mapping.replacement);
        });
        return text;
    };

    function has_installed(manifestURL) {
        return z.apps.indexOf(manifestURL) !== -1;
    }

    /* Global variables, provided in default context. */
    globals.CATEGORIES = categories;
    globals.DEVICE_CHOICES = compatibility_filtering.DEVICE_CHOICES;
    globals.feed = feed;
    globals.iarc_names = iarc.names;
    globals.NEWSLETTER_LANGUAGES = settings.NEWSLETTER_LANGUAGES;
    globals.REGIONS = regions.REGION_CHOICES_SLUG;
    globals.user_helpers = user_helpers;
    globals.PLACEHOLDER_ICON = urls.media('fireplace/img/icons/placeholder.svg');
    globals.compatibility_filtering = compatibility_filtering;

    /* Helpers functions, provided in the default context. */
    function indexOf(arr, val) {
        return arr.indexOf(val);
    }

    function app_notices(app) {
        // App notices for the app detail page (e.g., not available,
        // works offline). Returns an array of gettext/classes.
        var notices = [];
        // Positive notices.
        if (app.is_offline) {
            notices.push([gettext('Works offline'), 'positive']);
        }
        // Negative notices.
        var incompat_notices = apps.incompat(app) || [];
        incompat_notices.forEach(function(notice) {
            notices.push([notice, 'negative']);
        });
        return notices;
    }

    function getReviewId(resourceUri) {
        // Get review ID from resource URI.
        return resourceUri.match(/(\d+)\/$/)[1];
    }

    var helpers = {
        app_incompat: apps.incompat,
        app_notices: app_notices,
        cast_app: models('app').cast,
        format: format.format,
        getReviewId: getReviewId,
        has_installed: has_installed,
        numberfmt: nunjucks.require('filters').numberfmt,
        indexOf: indexOf
    };

    for (var i in helpers) {
        // Put the helpers into the nunjucks global.
        if (helpers.hasOwnProperty(i)) {
            globals[i] = helpers[i];
        }
    }

    return helpers;
});
