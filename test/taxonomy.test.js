var should = require('should');
var tax    = require('../lib/taxonomy.js').tax;
var sinon  = require('sinon');

// To run:
// <path>/taxonomy $ mocha -R list
describe('Taxonomy', function() {
    var jstree = null;
    beforeEach(function(done){
        done();
    });
    afterEach(function(done){
        tax.clear();
        done();
    });
    describe('Create tree', function() {
        it('should be able to add a root node', function(done) {
            var first = tax.addNode({"data":"bar"}, null);
            first.should.have.property("data", "bar");
            tax.getTree().data.length.should.equal(1);
            tax.getTree().data[0].should.have.property("data","bar");
            done();
        });
        it('should be able to add a root and children nodes', function(done) {
            var firstNode = tax.addNode({"data":"foo"}, null);
            var childNode = tax.addNode({"data":"bar"}, firstNode);
            var tree = tax.getTree().data;
            tree[0].children[0].should.have.property('data','bar');
            var secondChildNode = tax.addNode({"data":"child2"}, firstNode);
            tree[0].children[1].should.have.property('data','child2');
            done();
        });
        it('should be able to add children of children', function(done) {
            var firstNode = tax.addNode({"data":"foo"}, null);
            var childNode = tax.addNode({"data":"bar"}, firstNode);
            var grandchildNode = tax.addNode({"data":"grandchild"}, childNode);
            var greatGrandchildNode = tax.addNode({"data":"greatGrandchild"}, grandchildNode);
            var tree = tax.getTree().data;
            tree[0].children[0].should.have.property('data','bar');
            tree[0].children[0].children[0].should.be.a('object').and.have.property('data', 'grandchild');
            tree[0].children[0].children[0].should.not.have.property('data', 'nope');
            tree[0].children[0].children[0].children[0].should.have.property('data','greatGrandchild');
            done();
        });
        it('should create jstree with mulitple root nodes', function(done) {
            tax.addNode({"data":"a","attr": {"id":"aid"},"children":["achild1","achild2"]});
            tax.addNode({"data":"b","attr": {"id":"bid"},"children":["bchild1","bchild2"]});
            tax.addNode({"data":"c","attr": {"id":"cid"},"children":["cchild1","cchild2"]});
            var tree = tax.getTree();
            var data = tree.data;
            data[0].data.should.equal('a');
            data[1].data.should.equal('b');
            data[2].data.should.equal('c');
            data[2].children[1].should.equal('cchild2');
            done();
        });
        it('should return all roots', function(done) {
            tax.addNode({"data":"a","attr": {"id":"aid"},"children":["achild1","achild2"]});
            tax.addNode({"data":"b","attr": {"id":"bid"},"children":["bchild1","bchild2"]});
            var roots = tax.getRoots();
            roots.length.should.eql(2);
            roots[1].attr.id.should.eql('bid');
            roots[1].attr.id.should.not.eql('bogus');
            done();
        });
        it('should allow you to set the tree', function(done) {
			var t = {"data":['foo', 'bar', 'baz']};
            var tree = tax.setTree(t);
			tree.data[0].should.eql('foo');
			tree.data[2].should.eql('baz');
            done();
        });
    });
    describe('Create node', function() {
        it('should be able to create a node with data and children', function(done) {
            var anode = tax.createNode(['foo','bar','baz'], 'some data');
            anode.should.have.property("data", "some data");
            anode.children.should.eql(['foo','bar','baz']);
            done();
        });
        it('should keep user defined slug attr when supplied and default should NOT overwrite', function(done) {
            var anode = tax.createNode(null, 'My Cool Data', {attr:{'data-slug':'slugs-are-cool'}});
            anode.attr.should.have.property("data-slug", "slugs-are-cool");
            done();
        });
        it('should trim user defined slug attr', function(done) {
            var anode = tax.createNode(null, 'My Cool Data', {attr:{'data-slug':'     spaces-slug           '}});
            anode.attr.should.have.property("data-slug", "spaces-slug");
            done();
        });
        it('should add a default slug attr when creating node with legal chars', function(done) {
            var anode = tax.createNode(null, 'My Cool Data');
            anode.attr.should.have.property("data-slug", "my-cool-data");
            anode = tax.createNode(null, 'My     Data      With lots Of  SPaCeS!');
            anode.attr.should.have.property("data-slug","my-data-with-lots-of-spaces");
            anode = tax.createNode(null, '^^^REMOVE!!!Ill3gal$s*&^%$#@!~');
            anode.attr.should.have.property('data-slug','removeill3gals');
            done();
        });
        it('should be able to create a node and any arbitrary properties should be presevered', function(done) {
            var anode = tax.createNode(['foo','bar','baz'], 'mydata', 
                {'attr':{'href':'#','id':'me_id'},
                 "state":"closed", 
                 "metadata" : "a string, array, object, etc",
                 "title" : "My TiTle" });
            anode.attr.should.eql({'href':'#','id':'me_id', 'data-slug':'mydata'});
            // following tests that user defined attr.id takes precendence over auto
            // generated node._id
            anode._id.should.eql('me_id');
            anode.state.should.eql('closed');
            anode.metadata.should.eql('a string, array, object, etc');
            anode.title.should.eql('My TiTle');
            var firstNode = tax.addNode(anode, null);
            var childNode = tax.addNode({"data":"bar"}, firstNode);
            var tree = tax.getTree().data;
            tree[0].children[3].should.have.property('data','bar');
            done();
        });
        it('should create unique IDs if same node is added to two sub trees', function(done) {
            var anode = tax.createNode(null, 'A');
            var bnode = tax.createNode(null, 'B');
            var cnode = tax.createNode(null, 'C');
            // add roots
            tax.addNode(anode);
            tax.addNode(bnode);
            var a = tax.addNode(cnode, anode);
            var b = tax.addNode(cnode, bnode);
            a._id.should.not.eql(b._id);
            done();
        });
        it('should be disallow adding node that has no data: property', function(done) {
            var nodata = null;
            // Can't create node with no data property
            try {
                nodata = tax.createNode(['bar']);
            } catch(e) {
                e.name.should.eql('RequireFieldError');
                e.message.should.match(/.*require.*/i);
            }

            // Can't add a node with no data property. Can only happen if node 
            // provided is created inline
            try {
                var anode = tax.createNode(null, 'foo');
                tax.addNode(anode, null);
                tax.addNode({'nodata':'ohoh!'}, anode);
            } catch(e) {
                e.name.should.eql('RequireFieldError');
            }
            done();
        });
    });
    describe('Update node', function() {
        it('should be able to update a node\'s data property', function(done) {
            var anode = tax.createNode(['leaf'], 'foo');
            var bnode = tax.createNode(['leaf2'], 'bar');
            tax.addNode(anode, null);
            tax.addNode(bnode, anode);
            var match = tax.update(bnode._id, 'newval');
            var find  = tax.find(bnode._id);
            find.data.should.eql('newval');
            // Try a more deeply nested node
            var i, n, arr;
            arr = [];
            for(i=1; i<=10;i++) {
                n = tax.createNode(null, i);
                tax.addNode(n, arr.pop());
                arr.push(n);
            }
            var lastnode = arr.pop();
            var lastid = lastnode._id;
            tax.update(lastid, 'yoyoyo');
            tax.find(lastid).data.should.eql('yoyoyo');
            done();
        });

        it('should be able to update a node\'s extended properties', function(done) {
			var anode = tax.createNode(null, 'ANode', 
				{attr:{'data-slug':'original-slug', 'data-desc':'original desc'}});
            tax.addNode(anode, null);
			var clone = JSON.parse(JSON.stringify(anode));
			clone.data = 'updated_node_data';
			clone.attr['data-slug'] = 'updated-slug';
			clone.attr['data-desc'] = 'updated desc';

            var updatedNode = tax.updateNode(anode._id, clone);
            updatedNode.attr.should.have.property("data-slug", "updated-slug");
            updatedNode.attr.should.have.property("data-desc", "updated desc");
			updatedNode.data.should.eql('updated_node_data');
            done();
        });
        it('should be able to move a node', function(done) {
            var parent = tax.createNode(null, 'p1');
            var parent2 = tax.createNode(null, 'p2');
            tax.addNode(parent, null);
            tax.addNode(parent2, null);
			var anode = tax.createNode(null, 'ANode', 
				{attr:{'data-slug':'original-slug', 'data-desc':'original desc'}});
            tax.addNode(anode, parent);
            var movedNode = tax.move(anode, parent2._id);
            var p2 = tax.find(parent2._id);
			var foundMatch = false;
			for(var i=0;i<p2.children.length;i++) {
				if(p2.children[i]._id === movedNode._id) foundMatch = true;
			}
			foundMatch.should.eql(true);

			// now move back to original parent and check again
            movedNode = tax.move(anode, parent._id);
            var p = tax.find(parent._id);
			foundMatch = false;
			for(var j=0;j<p.children.length;j++) {
				if(p.children[j]._id === movedNode._id) foundMatch = true;
			}
			foundMatch.should.eql(true);

            done();
        });
    });

    describe('Visit related operations', function() {
        it('should be able to find a child in node by id', function(done) {
            var anode = tax.createNode(['foo','bar','baz'], 'some data');
            var bnode = tax.createNode(['wang','jang','bang'], 'some more data');
            var cnode = tax.createNode(['dang','fang','bang'], 'some more data');
            tax.addNode(anode, null);
            tax.addNode(bnode, null);
            tax.addNode(cnode, anode);
            var match = tax.find(cnode._id);
            match.should.eql(cnode);
            // Go a few levels deeper ;)
            var dnode = tax.createNode(['do','re','me'], 'music baby');
            var enode = tax.createNode(['fa','so','la'], 'yeah');
            var fnode = tax.createNode(['ti','do','re'], 'oh yeah');
            tax.addNode(dnode, bnode);
            tax.addNode(enode, dnode);
            tax.addNode(fnode, enode);
            match = null;
            match = tax.find(fnode._id);
            match.should.eql(fnode);
            done();
        });
        it('should be able to insert child node after parent', function(done) {
            var parent = tax.createNode(['foo'], 'some data');
            tax.addNode(parent, null);
            var child = tax.createNode(['bar'],'bar data');
            tax.insert(child, parent._id);
            var tree = tax.getTree().data;
            tree[0].children[1].should.eql(child);
            tax.find(parent._id).children[1].should.eql(child);
            done();
        });
        it('should be able to insert child node after parent at index', function(done) {
            var parent = tax.createNode(['foo','bar','qux'], 'some data');
            tax.addNode(parent, null);
            var child = tax.createNode(['bar'],'bar data');
            tax.insert(child, parent._id, 2);
            tax.find(parent._id).children.length.should.eql(4);
            tax.find(parent._id).children[2].should.eql(child);
            done();
        });
        it('should be able to find parent and child object from child id', function(done) {
            var parent = tax.createNode(['foo','bar','qux'], 'some data');
            tax.addNode(parent, null);
            var child = tax.createNode(['bar'],'bar data');
            tax.insert(child, parent._id, 2);
            var pc = tax.findParentChild(child._id);
            pc.child.should.eql(child);
            pc.parent.should.eql(parent);
            done();
        });
        it('should remove root nodes', function(done) {
            var parent = tax.createNode(null, 'p1');
            var parent2 = tax.createNode(null, 'p2');
            var parent3 = tax.createNode(null, 'p3');
            tax.addNode(parent, null);
            tax.addNode(parent2, null);
            tax.addNode(parent3, null);
            var removed = tax.remove(parent2._id);
            removed.should.eql(true);
            removed = tax.remove(parent3._id);
            removed.should.eql(true);
            removed = tax.remove(parent._id);
            removed.should.eql(true);
			tax.getRoots().should.eql([]);
            done();
        });
        it('should be able to insert then remove node object', function(done) {
            var parent = tax.createNode(['foo','bar','qux'], 'some data');
            tax.addNode(parent, null);
            var child = tax.createNode(['bar'],'bar data');
            tax.insert(child, parent._id, 2);
            var removed = tax.remove(child._id);
            removed.should.eql(true);
            removed = tax.remove('bogux_xxx');
            removed.should.eql(false);
            done();
        });
        it('should be able to determine if leaf', function(done) {
            var parent = tax.createNode(['foo','bar','qux'], 'some data');
            tax.addNode(parent, null);
            var child = tax.createNode(null,'bar data');
            tax.insert(child, parent._id, 2);
            parent.isLeaf.should.eql(false);
            child.isLeaf.should.eql(true);
            var grandchildNode = tax.addNode({"data":"grandchild"}, child);
            grandchildNode.isLeaf.should.eql(true);
            tax.addNode({"data":"great_grandchild"}, grandchildNode);
            grandchildNode.isLeaf.should.eql(false);
            done();
        });
        it('should change isleaf upon removal', function(done) {
            var parent = tax.createNode(['foo','bar','qux'], 'some data');
            tax.addNode(parent, null);
            var child = tax.createNode(null,'bar data');
            tax.insert(child, parent._id, 2);
            var grandchildNode = tax.addNode({"data":"grandchild"}, child);
            grandchildNode.isLeaf.should.eql(true);
            tax.addNode({"data":"great_grandchild"}, grandchildNode);
            // Before removal, child.isLeaf==false as it still has grandchildren
            child.isLeaf.should.eql(false);
            // However, after removing grandchild, child.isLeaf will eq true
            tax.remove(grandchildNode._id);
            child.isLeaf.should.eql(true);
            done();
        });
        it('should be able to get the path of a node', function(done) {
            var p    = tax.createNode(null, "parent");
            var c    = tax.createNode(null, "child");
            var c2   = tax.createNode(null, "child2");
            var c3   = tax.createNode(null, "child3");
            var g    = tax.createNode(null, "grandchild");
            var g2   = tax.createNode(null, "grandchild2");
            var gg   = tax.createNode(null, "ggrandchild");
            var gg2  = tax.createNode(null, "ggrandchild2");
            var gg3  = tax.createNode(null, "ggrandchild3");
            tax.addNode( gg, tax.addNode(g, tax.addNode(c, tax.addNode(p, null))));
            tax.addNode( gg2, tax.addNode(g2, tax.addNode(c2, p)));
            tax.addNode( gg3, g);
            var path = null;
            path = tax.path(gg._id);
            path.should.eql('/parent/child/grandchild/');
            path = tax.path(gg2._id);
            path.should.eql('/parent/child2/grandchild2/');
            path = tax.path(gg3._id);
            path.should.eql('/parent/child/grandchild/');
			// Should be able to include section in path if true passed
            path = tax.path(gg3._id, true, true);
            path.should.eql('/parent/child/grandchild/ggrandchild3');
            done();
        });
        it('should be able to get the path of deeply nested node', function(done) {
            var path = null, i, n, arr;
            arr = [];
            for(i=1; i<=10;i++) {
                n = tax.createNode(null, i);
                tax.addNode(n, arr.pop());
                arr.push(n);
            }
            path = tax.path(arr.pop()._id);
            path.should.eql('/1/2/3/4/5/6/7/8/9/');
            done();
        });
        it('should find by path', function(done) {
            var p    = tax.createNode(null, "parent");
            var c    = tax.createNode(null, "child");
            var g    = tax.createNode(null, "grandchild");
            tax.addNode( g, tax.addNode(c, tax.addNode(p, null)));
            var path = '/parent/child/grandchild/';
			var id = tax.findByPath(path);
            id.should.eql(g._id);
            done();
        });
        it('should return null from find by path if not found', function(done) {
            var p    = tax.createNode(null, "parent");
            var c    = tax.createNode(null, "child");
            var g    = tax.createNode(null, "grandchild");
            tax.addNode( g, tax.addNode(c, tax.addNode(p, null)));
            var path = '/parent/child/grandchild/EXTRA';
			var id = tax.findByPath(path);
            (id===null).should.eql(true);
            done();
        });
        it('should be able to return id even when the path is deeply nested', function(done) {
            var path = null, i, n, arr;
            arr = [];
            for(i=1; i<10;i++) {
                n = tax.createNode(null, i);
                tax.addNode(n, arr.pop());
                arr.push(n);
            }
            var id = tax.findByPath('/1/2/3/4/5/6/7/8/9');
            var lastid = arr.pop()._id;
            id.should.eql(lastid);
            done();
        });
        it('should find id by path for subsequent root nodes', function(done) {
            var p    = tax.createNode(null, "parent");
            var p2    = tax.createNode(null, "parent2");
            var p3    = tax.createNode(null, "parent3");
            var c    = tax.createNode(null, "child");
            var g    = tax.createNode(null, "grandchild");
            tax.addNode( g, tax.addNode(c, tax.addNode(p, null)));
            tax.addNode( p2, null);
            tax.addNode( p3, null);
            var path = '/parent2';
			var id = tax.findByPath(path);
            id.should.eql(p2._id);
            done();
        });
    });

    describe('Walk related operations', function() {
        it('should callback start_el, end_el, start_lvl, and end_lvl', function(done) {
			var startElSpy     = sinon.spy();
			var startLvlSpy    = sinon.spy();
			var endElSpy       = sinon.spy();
			var endLvlSpy      = sinon.spy();
			var notCalledSpy = sinon.spy();

            var p = tax.createNode(null, 'p');
            tax.addNode(p, null);
            var c = tax.createNode(null, 'c');
            tax.addNode(c, p);
            var gc = tax.createNode(null, 'gc');
            tax.addNode(gc, c);
			tax.walk({
				start_el: startElSpy,
				end_el: endElSpy,
				start_lvl: startLvlSpy,
				end_lvl: endLvlSpy,
				nonesense: notCalledSpy 
			});
			startElSpy.calledThrice.should.eql(true);
			endElSpy.calledThrice.should.eql(true);
			startLvlSpy.calledThrice.should.eql(true);
			endLvlSpy.calledThrice.should.eql(true);
			notCalledSpy.called.should.eql(false);
			done();
        });
		it('should callback start_el, end_el, start_lvl, and end_lvl', function(done) {
			var startElSpy     = sinon.spy();
			var startLvlSpy    = sinon.spy();
			var endElSpy       = sinon.spy();
			var endLvlSpy      = sinon.spy();

            var p  = tax.createNode(null, 'p');
            var p2 = tax.createNode(null, 'p2');
            var p3 = tax.createNode(null, 'p3');
            var p4 = tax.createNode(null, 'p4');
            tax.addNode(p, null);
            tax.addNode(p2, null);
            tax.addNode(p3, null);
            tax.addNode(p4, null);
            var c  = tax.createNode(null, 'c');
            var c2 = tax.createNode(null, 'c2');
            var c3 = tax.createNode(null, 'c3');
            tax.addNode(c, p);
            tax.addNode(c2, p2);
            tax.addNode(c3, p2);
            var gc  = tax.createNode(null, 'gc');
            var gc2 = tax.createNode(null, 'gc2');
            tax.addNode(gc, c);
            tax.addNode(gc2, c2);
			tax.walk({
				start_el:   startElSpy,
				end_el:     endElSpy,
				start_lvl:  startLvlSpy,
				end_lvl:    endLvlSpy
			});

			// Test levels
			startLvlSpy.firstCall.args[0].should.eql(1);	
			startLvlSpy.secondCall.args[0].should.eql(2);	
			startLvlSpy.thirdCall.args[0].should.eql(3);	
			endLvlSpy.lastCall.args[0].should.eql(1);	

			// Test call counts
			startElSpy.callCount.should.eql(9);
			endElSpy.callCount.should.eql(9);
			startLvlSpy.callCount.should.eql(5);
			endLvlSpy.callCount.should.eql(5);

			done();
        });

        it('should walking should respect maxdepth', function(done) {
            var i, n, n2, arr, popped;
			var startLvlSpy = sinon.spy();
            var arr = [];

            for(i=1; i<1000;i++) {
                n  = tax.createNode(null, i);
                n2 = tax.createNode(null, i);
				popped = arr.pop();
                tax.addNode(n, popped);
                tax.addNode(n2, popped);
                arr.push(n);
            }
			var maxdepth = 10;
			tax.walk({
				start_lvl:  startLvlSpy
			}, maxdepth);
			startLvlSpy.lastCall.args[0].should.eql(10);

            done();
        });
		
        it('should render and use defaults', function(done) {
			var startLvlSpy = sinon.spy(),
				arr = [];
            var foo = tax.createNode(null, 'foo');
            var foo2 = tax.createNode(null, 'foo2');
            var bar = tax.createNode(null, 'bar');
            var bar2 = tax.createNode(null, 'bar2');
            var baz = tax.createNode(null, 'baz');
            var baz2 = tax.createNode(null, 'baz2');
            tax.addNode(foo, null);
            tax.addNode(bar, foo);
            tax.addNode(baz, bar);
			tax.addNode(foo2, null);
            tax.addNode(bar2, foo2);
            tax.addNode(baz2, bar2);
			var rendered = tax.render();
			//console.log(rendered);
			var f  = new RegExp('sid_' + foo._id);
			var f2  = new RegExp('sid_' + foo2._id);
			var b  = new RegExp('sid_' + bar._id);
			var b2  = new RegExp('sid_' + bar2._id);
			var bz = new RegExp('sid_' + baz._id);
			var bz2 = new RegExp('sid_' + baz2._id);
			f.test(rendered).should.eql(true);
			b.test(rendered).should.eql(true);
			bz.test(rendered).should.eql(true);
			f2.test(rendered).should.eql(true);
			b2.test(rendered).should.eql(true);
			bz2.test(rendered).should.eql(true);
			/noiamnotcrazy/i.test(rendered).should.eql(false);
            done();
        });
        it('should render using supplied options', function(done) {
			var startLvlSpy = sinon.spy(),
				arr = [];
            var foo = tax.createNode(null, 'foo');
            var bar = tax.createNode(null, 'bar');
            tax.addNode(foo, null);
            tax.addNode(bar, foo);
			var rendered = tax.render({
				outerTag: 'div',
				innerTag: 'p',
				startPath: ''
			});
/*
<div class="level-1">
    <p class="sid_tax_21201329699355734"><a href="/#!/foo" title="View all under foo">foo</a>
        <div class="level-2">
            <p class="sid_tax_21211329699355734"><a href="/#!/foo/bar" title="View all under bar">bar</a></p>
        </div>
    </p>
</div>
*/
			var f  = new RegExp('sid_' + foo._id);
			var b  = new RegExp('sid_' + bar._id);
			f.test(rendered).should.eql(true);
			b.test(rendered).should.eql(true);
            done();
        });
    });

});
