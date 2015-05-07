/*
 * sc_linktrack-2.1.0
 * @author Elliot Eaton
 */
(function (_W, _D, _L) {
    'use strict';
    var $,
        SC = {},
        Inputs,
        base,
        $inputList,
        dragging = false,
        s = _W.s;
    if (_W.jQuery === undefined || s === undefined) {
        return;
    }
    $ = _W.jQuery.noConflict();

    try {

        SC.addEvent = function (_e, event, func) {
            if (_e.addEventListener) {
                _e.addEventListener(event, func, false);
            } else {
                _e.attachEvent('on' + event, func);
            }
        };

        SC.delegateStl = function (href, o) {
            var linkId = '',
                paramToGet = href.match(/[\w\=]*-?id\=([\w\W\/\-\&\'\"\=\#]*)[\&\#]?/i),
                propOverride = o.propOverride;

            if (dragging || o.$this.attr('data-called')) {
                return;
            }
            o.$this.attr('data-called', 'true');

            if (!paramToGet) {
                return;
            }
            linkId = paramToGet[paramToGet.length - 1];
            s = _W.s_gi(_W.s_account);
            s.trackExternalLinks = false;
            s.linkTrackVars = propOverride;
            s[propOverride] = linkId;
            s.tl(this, 'o', 'sc_linktrack2.0');
            //console.log('sent using s.tl ' + propOverride + ': ' + linkId);
        };

        SC.arrayNodeIndex = function (value, array) {
            var length = array.length,
                i = 0;
            for (i; i < length; i += 1) {
                if (value === array[i]) {
                    return i + 1;
                }
            }
            return false;
        };

        SC.partsName = function (object, array) {
            if (object.id) {
                return object.id;
            }
            var position = SC.arrayNodeIndex(object, array);
            return position;
        };

        SC.createId = function (urlObject, href, o) {
            var prefix = '',
                idType = '',
                newId = o.base,
                linkNum = '',
                $thisDiv,
                divNum = '',
                aTagList = {};
            prefix = (href.indexOf('?') > -1) ? '&' : '?';
            idType = o.idType || 'l-id=';
            $thisDiv = $(urlObject).closest(o.parentEl)[0];
            if (!o.idDivNum) {
                newId += '_' + o.idName;
            } else {
                divNum = SC.partsName($thisDiv, o.list);
                newId += '_' + o.idName + divNum;
            }
            if (o.idLinkNum) {
                aTagList = $(o.targetEl, $thisDiv);
                linkNum = SC.partsName(urlObject, aTagList);
                newId += '_' + linkNum;
            }
            return prefix + idType + newId;
        };

        SC.isIchibaDomain = function (host) {
            var length = _W.accountSetting._internalSite.length,
                i = 0;
            for (i; i < length; i += 1) {
                if (_W.accountSetting._internalSite[i].replace('/', '') === host) {
                    return true;
                }
            }
            return false;
        };
        SC.linkClick = function (o) {
            var newId,
                thisHref,
                host,
                overrideVal = this.getAttribute('sc-override');
            o = o.data;
            o.thisLink = this;

            if (this.href) {
                thisHref = this.href;
                //console.log(thisHref);
                o.cleanHref = thisHref.replace(/[\?|\&]\w{1,2}\-?id\=[\w\W\/\-\&\'\"\=\#]*/gi, '');
                //console.log(o.cleanHref);
                host = this.hostname;
            } else {
                o.tempStlFlag = true;
                o.cleanHref = '';
            }

            if (overrideVal) {
                SC.attachId(o, overrideVal);
                return;
            }

            //check link target to determine how to send data 
            if (o.forceParam || SC.isIchibaDomain(host)) { //internal link.  Decide l-id or s-id.
                o.idType = (/item|basket|cart/i.test(host)) ? 's-id=' : 'l-id=';
            } else if (/grp\d{2}\W{1}ias/i.test(host)) {
                o.idType = 'ap=s-id='; //ad link.  Needs special redirect parameters
            } else { //external link or non <a> tag.  Must use s.tl method.
                o.tempStlFlag = true;
            }

            //generate and send id value
            newId = SC.createId(this, o.cleanHref, o);
            if (newId) {
                SC.attachId(o, newId);
            }
        };

        SC.attachId = function (o, newId) {
            if (o.forceStl || o.tempStlFlag) { //s.tl is used for cases without valid <a href> or when forceStl=true
                o.$this = $(o.thisLink);
                SC.delegateStl(newId, o);
            } else { //standard path will add link parameter to end of URL
                o.thisLink.href = o.cleanHref + newId;
                //console.log(o.thisLink.href);
            }
        };

        SC.checkDrag = function () {
            var $body = $('body');
            $body.bind('touchmove', function () {
                dragging = true;
            });
            $body.bind('touchstart', function () {
                dragging = false;
            });
        };

        Inputs = function (inputAttr) {
            this.parentEl = inputAttr.parentel || '';
            this.targetEl = inputAttr.targetel || 'a';
            this.bindTrigger = inputAttr.bindtrigger || 'click';
            this.path = inputAttr.path || 0;
            this.idName = inputAttr.idname || '';
            this.idDivNum = inputAttr.iddivnum || false;
            this.idLinkNum = inputAttr.idlinknum || false;
            this.forceParam = inputAttr.forceparam || false;
            this.forceStl = inputAttr.forcestl || false;
            this.idTypeOverride = inputAttr.idtypeoverride || false;
            this.propOverride = inputAttr.propoverride || 'prop18';

            this.list = $(this.parentEl);
            if (this.list[0]) {
                this.init(this);
            }
        };

        Inputs.prototype = {
            init: function () {
                this.getBase();
                this.addToInput();
                this.attachLinkClick();
            },
            getBase: function () {
                var domain, layout, tempPath;
                if (base) {
                    this.base = base;
                } else {
                    domain = _L.host.replace('.rakuten.co.jp', '');
                    layout = this.getLayout();
                    tempPath = this.getPath(this.path);
                    this.base = base = domain + '_' + layout + '_' + tempPath;
                }
            },
            getPath: function (pathNum) {
                var count = parseInt(pathNum, 10),
                    path = _L.pathname,
                    pathArray = [],
                    pathTemp = '',
                    i = 0;
                if (isNaN(count) || path === '/') {
                    return '/';
                }
                if (count > 0) {
                    pathArray = path.match(/\W{1}\w*/g);
                    for (i; i < count; i += 1) {
                        if (pathArray[i]) {
                            pathTemp += pathArray[i];
                        }
                    }
                    path = pathTemp;
                }
                path = path.replace(/\/index\.html?/i, '');
                return path.slice(1);
            },
            getLayout: function () {
                var layout;
                if (_W.sc_layout !== undefined) {
                    layout = _W.sc_layout;
                }
                if (!layout) {
                    try {
                        layout = _D.getElementsByName('ge_layout')[0].value;
                    } catch (e) {
                        layout = '';
                    }
                }
                if (!layout) {
                    layout = _D.getElementsByName('viewport').length ? 'SP' : 'PC';
                }
                return layout;
            },
            addToInput: function () {
                var len = $inputList.length,
                    i = 0,
                    $temp;
                for (i; i < len; i++) {
                    $temp = $($inputList[i]);
                    if ($temp.attr('parentel') === this.parentEl) {
                        $temp.attr('result', this.base + '_' + this.idName);
                        break;
                    }
                }
            },
            attachLinkClick: function () {
                var len = this.list.length,
                    i = 0;
                if ($.prototype.on) {
                    for (i; i < len; i++) {
                        $(this.list[i]).on(this.bindTrigger, this.targetEl, this, SC.linkClick);
                    }
                } else if ($.prototype.delegate) {
                    for (i; i < len; i++) {
                        $(this.list[i]).delegate(this.targetEl, this.bindTrigger, this, SC.linkClick);
                    }
                } else {
                    for (i; i < len; i++) {
                        $(this.targetEl, this.list[i]).bind(this.bindTrigger, this, SC.linkClick);
                    }
                }
            }
        };

        SC.init = function () {
            var inputObj = {},
                inputAttr = {},
                thisAttr,
                len_i,
                len_j,
                i = 0,
                j = 0,
                options;

            $inputList = $("input.sclinktrack");
            len_i = $inputList.length;

            //grab input elements off page and initialize function using those options
            len_i = $inputList.length;
            for (i; i < len_i; i++) {
                inputAttr = {};
                inputObj = $inputList[i].attributes;
                len_j = inputObj.length;
                for (j = 0; j < len_j; j++) {
                    thisAttr = inputObj[j];
                    inputAttr[thisAttr.nodeName.toLowerCase()] = thisAttr.value;
                }
                options = new Inputs(inputAttr);
            }
            SC.checkDrag();
        };

        SC.addEvent(_W, 'load', SC.init);
    } catch (e) {
        return;
    }
}(window, document, location));
//Template Ver0.991 beta Designed by SeiichiTakeda. -->