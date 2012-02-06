var should = require('should');
var tax    = require('../lib/node/taxonomy.js');

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
    });

    describe('Create node', function() {
        it('should be able to create a node with data and children', function(done) {
            var anode = tax.createNode(['foo','bar','baz'], 'some data');
            anode.should.have.property("data", "some data");
            anode.children.should.eql(['foo','bar','baz']);
            done();
        });
        it('should be able to create a node and any arbitrary properties should be presevered', function(done) {
            var anode = tax.createNode(['foo','bar','baz'], 'mydata', 
                {'attr':{'href':'#','id':'me_id'},
                 "state":"closed", 
                 "metadata" : "a string, array, object, etc",
                 "title" : "My TiTle" });
            anode.attr.should.eql({'href':'#','id':'me_id'});
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
        it('should be able to insert node object', function(done) {
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
    });
});
