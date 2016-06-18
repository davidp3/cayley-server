// d3.tip
// Copyright (c) 2013 Justin Palmer
//
// Tooltips for d3.js SVG visualizations

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module with d3 as a dependency.
    define(['d3'], factory)
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = function(d3) {
      d3.tip = factory(d3)
      return d3.tip
    }
  } else {
    // Browser global.
    root.d3.tip = factory(root.d3)
  }
}(this, function (d3) {

  // Public - contructs a new tooltip
  //
  // Returns a tip
  return function() {
    var direction = d3_tip_direction,
        offset    = d3_tip_offset,
        html      = d3_tip_html,
        coord_override = d3_tip_coord_override,
        show_style = d3_tip_show_style,
        hide_style = d3_tip_hide_style,
        node      = initNode(),
        svg       = null,
        point     = null,
        target    = null

    function tip(vis) {
      svg = getSVGNode(vis)
      point = svg.createSVGPoint()
      document.body.appendChild(node)
    }

    // Public - show the tooltip on the screen
    //
    // Returns a tip
    tip.show = function() {
      var args = Array.prototype.slice.call(arguments)
      if(args[args.length - 1] instanceof SVGElement) target = args.pop()

      var content = html.apply(this, args),
          poffset = offset.apply(this, args),
          dir     = direction.apply(this, args),
          style   = show_style.apply(this, args),
          nodel   = this.getNodeEl(),
          i       = directions.length,
          coords,
          scrollTop  = document.documentElement.scrollTop || document.body.scrollTop,
          scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft

      nodel.html(content).style(style);

      while(i--) nodel.classed(directions[i], false)
      coords = direction_callbacks.get(dir).apply(this)
      nodel.classed(dir, true).style({
        top: (coords.top +  poffset[0]) + scrollTop + 'px',
        left: (coords.left + poffset[1]) + scrollLeft + 'px'
      })

      return tip
    }

    // Public - hide the tooltip
    //
    // Returns a tip
    tip.hide = function() {
      var hstyle = hide_style.apply(this);
      var nodel = this.getNodeEl();
      nodel.style(hstyle);
      return tip
    }

    // Public: Proxy attr calls to the d3 tip container.  Sets or gets attribute value.
    //
    // n - name of the attribute
    // v - value of the attribute
    //
    // Returns tip or attribute value
    tip.attr = function(n, v) {
      if (arguments.length < 2 && typeof n === 'string') {
        return this.getNodeEl().attr(n)
      } else {
        var args =  Array.prototype.slice.call(arguments)
        d3.selection.prototype.attr.apply(this.getNodeEl(), args)
      }

      return tip
    }

    // Public: Proxy style calls to the d3 tip container.  Sets or gets a style value.
    //
    // n - name of the property
    // v - value of the property
    //
    // Returns tip or style property value
    tip.style = function(n, v) {
      if (arguments.length < 2 && typeof n === 'string') {
        return this.getNodeEl().style(n)
      } else {
        var args =  Array.prototype.slice.call(arguments)
        d3.selection.prototype.style.apply(this.getNodeEl(), args)
      }

      return tip
    }

    // The style to use when showing the tooltip.
    // If changing this, you are advised to add to/alter the existing
    // structure instead of simply overwriting it.
    //
    // s - style to use when showing the tooltip
    //
    // Returns tip or current show style
    tip.show_style = function(s) {
      if (!arguments.length) return show_style;
      show_style = s == null ? s : d3.functor(s);

      return tip;
    }

    // The style to use when hiding the tooltip.
    // If changing this, you are advised to add to/alter the existing
    // structure instead of simply overwriting it.
    //
    // s - style to use when hiding the tooltip
    //
    // Returns tip or current hide style
    tip.hide_style = function(s) {
      if (!arguments.length) return hide_style;
      hide_style = s == null ? s : d3.functor(s);

      return tip;
    }

    // Public: Set or get the direction of the tooltip
    //
    // v - One of n(north), s(south), e(east), w(west), nw(northwest),
    //     sw(southwest), ne(northeast), se(southeast),
    //     c(center) and f(function).
    //
    // If v == 'f', you must also set the override function `func`.
    // This must be a zero or one-parameter function that returns
    // positions as an object of the form { top: TOP, left: LEFT }
    // where TOP and LEFT are in screen pixels.  The user function
    // will be passed this object.
    //
    // Returns tip or direction
    tip.direction = function(v, func) {
      if (!arguments.length) return direction
      direction = v == null ? v : d3.functor(v)
      if (v === 'f') coord_override = func;
      else coord_override = null;

      return tip
    }

    // Public: Sets or gets the offset of the tip
    //
    // v - The [top, left] offsets to apply to the tooltip.
    //
    // BEWARE: The order of the offsets is [y, x]!
    //
    // Returns offset or tip
    tip.offset = function(v) {
      if (!arguments.length) return offset
      offset = v == null ? v : d3.functor(v)

      return tip
    }

    // Public: sets or gets the html value of the tooltip
    //
    // v - String value of the tip
    //
    // Returns html value or tip
    tip.html = function(v) {
      if (!arguments.length) return html
      html = v == null ? v : d3.functor(v)

      return tip
    }

    // Get the d3 node for the tooltip.
    tip.getNodeEl = function () {
      if(node === null) {
        node = initNode();
        // re-add node to DOM
        document.body.appendChild(node);
      };
      return d3.select(node);
    }

    // Public: destroys the tooltip and removes it from the DOM
    //
    // Returns a tip
    tip.destroy = function() {
      if(node) {
        this.getNodeEl().remove();
        node = null;
      }
      return tip;
    }

    function d3_tip_direction() { return 'n' }
    function d3_tip_offset() { return [0, 0] }
    function d3_tip_html() { return ' ' }
    function d3_tip_coord_override() { return null; }
    function d3_tip_show_style() { return { opacity: 1, 'pointer-events': 'all' }; }
    function d3_tip_hide_style() { return { opacity: 0, 'pointer-events': 'none' }; }

    function d3_tip_midpoint(p1fun,p2fun) {
      return d3.functor( function() {
        return {
          top: (p1fun().top + p2fun().top) / 2,
          left: (p1fun().left + p2fun().left) / 2
        };
      });
    }

    var direction_callbacks = d3.map({
      n:  direction_n,
      s:  direction_s,
      e:  direction_e,
      w:  direction_w,
      c:  direction_c,
      nw: direction_nw,
      ne: direction_ne,
      sw: direction_sw,
      se: direction_se,
      f: coord_override_dispatch
    }),

    directions = direction_callbacks.keys()

    function direction_n() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.n.y - node.offsetHeight,
        left: bbox.n.x - node.offsetWidth / 2
      }
    }

    function direction_s() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.s.y,
        left: bbox.s.x - node.offsetWidth / 2
      }
    }

    function direction_e() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.e.y - node.offsetHeight / 2,
        left: bbox.e.x
      }
    }

    function direction_w() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.w.y - node.offsetHeight / 2,
        left: bbox.w.x - node.offsetWidth
      }
    }

    function direction_nw() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.nw.y - node.offsetHeight,
        left: bbox.nw.x - node.offsetWidth
      }
    }

    function direction_ne() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.ne.y - node.offsetHeight,
        left: bbox.ne.x
      }
    }

    function direction_sw() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.sw.y,
        left: bbox.sw.x - node.offsetWidth
      }
    }

    function direction_se() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.se.y,
        left: bbox.e.x
      }
    }

    function direction_c() {
      var nw = direction_nw();
      var se = direction_se();
      return {
        top:  (nw.top + se.top) / 2,
        left: (nw.left + se.left) / 2
      }
    }

    function coord_override_dispatch(t) {
      scrollTop  = document.documentElement.scrollTop || document.body.scrollTop,
      scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft
      var co = coord_override(t);
      return { top: co.top - scrollTop, left: co.left - scrollLeft };
    }

    function initNode() {
      var node = d3.select(document.createElement('div'))
      node.style({
        position: 'absolute',
        top: 0,
        opacity: 0,
        'pointer-events': 'none',
        'box-sizing': 'border-box'
      })

      return node.node()
    }

    function getSVGNode(el) {
      el = el.node()
      if(el.tagName.toLowerCase() === 'svg')
        return el

      return el.ownerSVGElement
    }

    // Private - gets the screen coordinates of a shape
    //
    // Given a shape on the screen, will return an SVGPoint for the directions
    // n(north), s(south), e(east), w(west), ne(northeast), se(southeast), nw(northwest),
    // sw(southwest).
    //
    //    +-+-+
    //    |   |
    //    +   +
    //    |   |
    //    +-+-+
    //
    // Returns an Object {n, s, e, w, nw, sw, ne, se}
    function getScreenBBox() {
      var targetel   = target || d3.event.target;

      while ('undefined' === typeof targetel.getScreenCTM && 'undefined' === targetel.parentNode) {
          targetel = targetel.parentNode;
      }

      var bbox       = {},
          matrix     = targetel.getScreenCTM(),
          tbbox      = targetel.getBBox(),
          width      = tbbox.width,
          height     = tbbox.height,
          x          = tbbox.x,
          y          = tbbox.y

      point.x = x
      point.y = y
      bbox.nw = point.matrixTransform(matrix)
      point.x += width
      bbox.ne = point.matrixTransform(matrix)
      point.y += height
      bbox.se = point.matrixTransform(matrix)
      point.x -= width
      bbox.sw = point.matrixTransform(matrix)
      point.y -= height / 2
      bbox.w  = point.matrixTransform(matrix)
      point.x += width
      bbox.e = point.matrixTransform(matrix)
      point.x -= width / 2
      point.y -= height / 2
      bbox.n = point.matrixTransform(matrix)
      point.y += height
      bbox.s = point.matrixTransform(matrix)

      return bbox
    }

    return tip
  };

}));
