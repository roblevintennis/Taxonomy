_taxonomy_ is a library for manipulating a tree structure that's suitable for rendering jstree tree views on the front end. It environment is [node](http://nodejs.org). Although the author implemented for jstree interoperability, it could be used wherever it's tree structure is satisfactory (the tree is essentially a combination of node object literals that have optional children arrays).

## Example

Require taxonomy.js .. assuming in node.js env:

    var tax = require('../lib/taxonomy.js');

Now build up your tree passing in the node and it's optional parent. If parent is not provided it is assumed you want the node to hang of the root of your tree:

    var firstNode = tax.addNode({"data":"foo"}, null);
    var childNode = tax.addNode({"data":"bar"}, firstNode);
    var grandchildNode = tax.addNode({"data":"grandchild"}, childNode);
    var greatGrandchildNode = tax.addNode({"data":"greatGrandchild"}, grandchildNode);
    var tree = tax.getTree().data;

    console.log(JSON.stringify(tree, null, '  '));
    /* outputs:
    [
      {
        "data": "foo",
        "_id": "tax_4",
        "children": [
          {
            "data": "bar",
            "_id": "tax_5",
            "children": [
              {
                "data": "grandchild",
                "_id": "tax_6",
                "children": [
                  {
                    "data": "greatGrandchild",
                    "_id": "tax_7",
                    "children": [],
                    "isLeaf": true
                  }
                ],
                "isLeaf": false
              }
            ],
            "isLeaf": false
          }
        ],
        "isLeaf": false
      }
    ]
    */

## createNode and addNode

Adding nodes inline in addNode (like in the above example) is not the preferred way to create nodes. The method createNode is a convenience method which takes an array of leaf children (null in following example), and data property's value:

    var node = tax.createNode(['foo','bar','qux'], 'mydata');

So above we have 'foo', 'bar', and 'baz' as child leafs of node and 'mydata' as the value of node's data property. Here's another example creating a nested tree where the nodes have no leaf children (because null is passed):

    var p    = tax.createNode(null, "parent");
    var c    = tax.createNode(null, "child");
    var g    = tax.createNode(null, "grandchild");
    var gg   = tax.createNode(null, "ggrandchild");
    tax.addNode( gg, tax.addNode(g, tax.addNode(c, tax.addNode(p, null))));
    console.log(JSON.stringify(tax.getTree(), null, '  '));
    /* outputs:
    {
      "data": [
        {
          "children": [
            {
              "children": [
                {
                  "children": [
                    {
                      "children": [],
                      "data": "ggrandchild",
                      "_id": "tax_46",
                      "isLeaf": true
                    }
                  ],
                  "data": "grandchild",
                  "_id": "tax_44",
                  "isLeaf": false
                }
              ],
              "data": "child",
              "_id": "tax_41",
              "isLeaf": false
            }
          ],
          "data": "parent",
          "_id": "tax_40",
          "isLeaf": false
        }
      ]
    }
    */

## Get the path of a node

Assuming gg is a great grandchild node you can pass it's id and get back it's unix style path:

    path = tax.path(gg._id);
    path.should.eql('/parent/child/grandchild/');

NOTE: You'll notice from the example above that I've chosen to omit the basename itself. This allows you to choose an arbitrary basename (e.g. if you have a "slug" that's different than the data property, etc.). Of course, you can easily append it if that's what you'd like to achieve.

Tested to work with deeply nested paths:

    var path = null, i, n, arr;
    arr = [];
    for(i=1; i<=10;i++) {
        n = tax.createNode(null, i);
        tax.addNode(n, arr.pop());
        arr.push(n);
    }
    path = tax.path(arr.pop()._id);
    path.should.eql('/1/2/3/4/5/6/7/8/9/');

## Inserting nodes

You can insert nodes as children of a parent node at either the end or optional index provided:

    tax.insert(child, parent._id, 2);


## Updating nodes

You can update a node's data property by passing the node's ID and the new data value:

    var match = tax.update(bnode._id, 'newval');
    var find  = tax.find(bnode._id);
    find.data.should.eql('newval');

## Removing nodes

You can remove a node by passing in it's id. Subsequently, the deleted node's parent's isLeaf property will go from being true to false (if deleted node was parent's only child of course!)

    tax.remove(grandchildNode._id);
    child.isLeaf.should.eql(true);

## Arbitrary properties are retained 

The only "required" property of a node is 'data'. If not provided to createNode (or you create node inline in call to addNode), it will throw RequireFieldError. However, once you've met this requirement you can add arbitrary fields. For example, here are some jstree-specific properties being added to a node:

    var anode = tax.createNode(['leaf1','leaf2','leaf3'], 'data_here',
        // and here are some arbitrary jstree fields which will be preserved:
        {'attr':{'href':'#',
         'id':'me_id'},
         "state":"closed", 
         "metadata" : "a string, array, object, etc",
         "title" : "My Title" });

## Installation

    $ npm install taxonomy

## Tests

    $ npm install --dev
    $ mocha -R list

## License 

(The MIT License)

Copyright (c) 2012 Rob Levin &lt;roblevintennis@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
