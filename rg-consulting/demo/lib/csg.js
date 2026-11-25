/* =====================================================================
   CSG.js – Constructive Solid Geometry (BSP), nach Evan Wallace (MIT).
   Reines JavaScript, offline, kein WASM. Liefert window.CSG.
   union / subtract / intersect auf Polygon-Solids.
   ===================================================================== */
(function (global) {
  "use strict";

  function CSG() { this.polygons = []; }
  CSG.fromPolygons = function (polygons) { var c = new CSG(); c.polygons = polygons; return c; };
  CSG.prototype = {
    clone: function () { var c = new CSG(); c.polygons = this.polygons.map(function (p) { return p.clone(); }); return c; },
    toPolygons: function () { return this.polygons; },
    union: function (csg) {
      var a = new CSG.Node(this.clone().polygons), b = new CSG.Node(csg.clone().polygons);
      a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.allPolygons());
      return CSG.fromPolygons(a.allPolygons());
    },
    subtract: function (csg) {
      var a = new CSG.Node(this.clone().polygons), b = new CSG.Node(csg.clone().polygons);
      a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.allPolygons()); a.invert();
      return CSG.fromPolygons(a.allPolygons());
    },
    intersect: function (csg) {
      var a = new CSG.Node(this.clone().polygons), b = new CSG.Node(csg.clone().polygons);
      a.invert(); b.clipTo(a); b.invert(); a.clipTo(b); b.clipTo(a); a.build(b.allPolygons()); a.invert();
      return CSG.fromPolygons(a.allPolygons());
    },
    inverse: function () { var c = this.clone(); c.polygons.forEach(function (p) { p.flip(); }); return c; }
  };

  CSG.Vector = function (x, y, z) { this.x = x; this.y = y; this.z = z; };
  CSG.Vector.prototype = {
    clone: function () { return new CSG.Vector(this.x, this.y, this.z); },
    negated: function () { return new CSG.Vector(-this.x, -this.y, -this.z); },
    plus: function (a) { return new CSG.Vector(this.x + a.x, this.y + a.y, this.z + a.z); },
    minus: function (a) { return new CSG.Vector(this.x - a.x, this.y - a.y, this.z - a.z); },
    times: function (a) { return new CSG.Vector(this.x * a, this.y * a, this.z * a); },
    dividedBy: function (a) { return new CSG.Vector(this.x / a, this.y / a, this.z / a); },
    dot: function (a) { return this.x * a.x + this.y * a.y + this.z * a.z; },
    lerp: function (a, t) { return this.plus(a.minus(this).times(t)); },
    length: function () { return Math.sqrt(this.dot(this)); },
    unit: function () { return this.dividedBy(this.length()); },
    cross: function (a) { return new CSG.Vector(this.y * a.z - this.z * a.y, this.z * a.x - this.x * a.z, this.x * a.y - this.y * a.x); }
  };

  CSG.Vertex = function (pos, normal) { this.pos = pos.clone(); this.normal = normal.clone(); };
  CSG.Vertex.prototype = {
    clone: function () { return new CSG.Vertex(this.pos, this.normal); },
    flip: function () { this.normal = this.normal.negated(); },
    interpolate: function (o, t) { return new CSG.Vertex(this.pos.lerp(o.pos, t), this.normal.lerp(o.normal, t)); }
  };

  CSG.Plane = function (normal, w) { this.normal = normal; this.w = w; };
  CSG.Plane.EPSILON = 1e-5;
  CSG.Plane.fromPoints = function (a, b, c) {
    var cp = b.minus(a).cross(c.minus(a));
    var len = cp.length();
    var n = (len > 1e-10) ? cp.dividedBy(len) : new CSG.Vector(0, 0, 1);   // degeneriertes Dreieck -> Ersatznormale (kein NaN)
    return new CSG.Plane(n, n.dot(a));
  };
  CSG.Plane.prototype = {
    clone: function () { return new CSG.Plane(this.normal.clone(), this.w); },
    flip: function () { this.normal = this.normal.negated(); this.w = -this.w; },
    splitPolygon: function (polygon, coplanarFront, coplanarBack, front, back) {
      var COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;
      var polygonType = 0, types = [];
      for (var i = 0; i < polygon.vertices.length; i++) {
        var t = this.normal.dot(polygon.vertices[i].pos) - this.w;
        var type = (t < -CSG.Plane.EPSILON) ? BACK : (t > CSG.Plane.EPSILON) ? FRONT : COPLANAR;
        polygonType |= type; types.push(type);
      }
      switch (polygonType) {
        case COPLANAR:
          (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon); break;
        case FRONT: front.push(polygon); break;
        case BACK: back.push(polygon); break;
        case SPANNING:
          var f = [], b = [];
          for (var j = 0; j < polygon.vertices.length; j++) {
            var k = (j + 1) % polygon.vertices.length;
            var ti = types[j], tj = types[k];
            var vi = polygon.vertices[j], vj = polygon.vertices[k];
            if (ti !== BACK) f.push(vi);
            if (ti !== FRONT) b.push(ti !== BACK ? vi.clone() : vi);
            if ((ti | tj) === SPANNING) {
              var t2 = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.minus(vi.pos));
              var v = vi.interpolate(vj, t2);
              f.push(v); b.push(v.clone());
            }
          }
          if (f.length >= 3) front.push(new CSG.Polygon(f, polygon.shared));
          if (b.length >= 3) back.push(new CSG.Polygon(b, polygon.shared));
          break;
      }
    }
  };

  CSG.Polygon = function (vertices, shared) {
    this.vertices = vertices; this.shared = shared;
    this.plane = CSG.Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
  };
  CSG.Polygon.prototype = {
    clone: function () { return new CSG.Polygon(this.vertices.map(function (v) { return v.clone(); }), this.shared); },
    flip: function () { this.vertices.reverse().forEach(function (v) { v.flip(); }); this.plane.flip(); }
  };

  CSG.Node = function (polygons) { this.plane = null; this.front = null; this.back = null; this.polygons = []; if (polygons) this.build(polygons); };
  CSG.Node.prototype = {
    clone: function () {
      var n = new CSG.Node();
      n.plane = this.plane && this.plane.clone();
      n.front = this.front && this.front.clone();
      n.back = this.back && this.back.clone();
      n.polygons = this.polygons.map(function (p) { return p.clone(); });
      return n;
    },
    invert: function () {
      for (var i = 0; i < this.polygons.length; i++) this.polygons[i].flip();
      this.plane.flip();
      if (this.front) this.front.invert();
      if (this.back) this.back.invert();
      var t = this.front; this.front = this.back; this.back = t;
    },
    clipPolygons: function (polygons) {
      if (!this.plane) return polygons.slice();
      var front = [], back = [];
      for (var i = 0; i < polygons.length; i++) this.plane.splitPolygon(polygons[i], front, back, front, back);
      if (this.front) front = this.front.clipPolygons(front);
      if (this.back) back = this.back.clipPolygons(back); else back = [];
      return front.concat(back);
    },
    clipTo: function (bsp) {
      this.polygons = bsp.clipPolygons(this.polygons);
      if (this.front) this.front.clipTo(bsp);
      if (this.back) this.back.clipTo(bsp);
    },
    allPolygons: function () {
      var polygons = this.polygons.slice();
      if (this.front) polygons = polygons.concat(this.front.allPolygons());
      if (this.back) polygons = polygons.concat(this.back.allPolygons());
      return polygons;
    },
    build: function (polygons) {
      if (!polygons.length) return;
      if (!this.plane) this.plane = polygons[0].plane.clone();
      var front = [], back = [];
      for (var i = 0; i < polygons.length; i++) this.plane.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
      if (front.length) { if (!this.front) this.front = new CSG.Node(); this.front.build(front); }
      if (back.length) { if (!this.back) this.back = new CSG.Node(); this.back.build(back); }
    }
  };

  global.CSG = CSG;
})(window);
