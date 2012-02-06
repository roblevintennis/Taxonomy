/*!
 * Taxonomy
 * Copyright(c) 2012 Rob Levin <roblevintennis@gmail.com>
 * MIT Licensed
 */

/**
 * Dependencies
 */
if (typeof _ === 'undefined') {
    _ = require('underscore');
}

var root = {"data":[]};

/**
* Creates a node
*
* @param {Array} Optional array of children.
* @param {Object} Node's data
* @param {Object} Any extra properties desired to be added to this node.
* @return {Object} The node created
*/
var createNode = function(children, data, extraProps) {
    var n = {};
    if(typeof data==='undefined') {
        throw {name : "RequireFieldError", message : "Node requires data property."};
    }
    var c = children || [];
    n.children = c;
    n.data = data;
    if(extraProps) {
        _.extend(n,extraProps);
    }
    n = normalize(n);
    return n;
};
/**
* Adds a node as child of parent node at optional position or end.
*
* @param {Object} Child node
* @param {Object} Parent we will add child to. Will be in parent's children array.
* @param {int} Optional position; index in parent's children array to place child node.
* @return {Object} The child node
*/
var addNode = function(child, parentNode, position) {
    var retChild = null;
    if(find(child._id)) {
        retChild = cloneNode(child);
    } else {
        retChild = child;
    }
    retChild = normalize(retChild);
    if(!retChild || typeof retChild.data==='undefined') {
        throw {name : "RequireFieldError", message : "addNode requires child node with data property."};
    }
    if(!parentNode) {
        root.data.push(retChild);
    } else {
        // First make sure the parent node has children array
        if(!parentNode.hasOwnProperty('children')) {
            parentNode.children = [];
        }
        parentNode.isLeaf = false;
        if (position === undefined) {
            parentNode.children.push(retChild);
        } else if(position < parentNode.children.length) {
            parentNode.children.splice(position, 0, retChild);
        } 
    }
    return retChild;
};

// Somewhat ugly clone impl but it works for our needs `:-)
var cloneNode = function(o) { 
    var retObj = null;
    function F(){}
    F.prototype = o; 
    retObj = new F();
    // Now that we've essentially cloned the object we
    // overwrite the _id with a unique one
    retObj._id = _.uniqueId('tax_');
    return retObj;
};

/**
* Insert a node as child of parent node with parentId at optional position.
*
* @param {Object} Child node
* @param {Object} Parent ID for which we will add child to.
* @param {int} Optional position; index in parent's children array to place child node.
* @return {Object} The child node
*/
var insert = function(node, parentId, position) {
    var parentNode = find(parentId);
    addNode(node, parentNode, position);
};
/**
* Removes a node.
*
* @param {Object} Child node's ID
* @return {Boolean} Indication of whether or not child node was successfully removed.
*/
var remove = function(childId) {
    var foundChild = false;
    var pc = findParentChild(childId);

    if(pc && pc.parent && pc.parent.children) {
        pc.parent.children = _.reject(pc.parent.children, function(c) {
            if( c._id === childId )  {
                foundChild = true;
                return true;
            }
            return false;
        });
        // Mark parent is leaf or not
        if(!pc.parent.children.length) {
            pc.parent.isLeaf = true;
        } else {
            pc.parent.isLeaf = false;
        }
    }
    return foundChild;
};
/**
* Finds a node by ID
*
* @param {ID} ID of node being searched for.
* @return {Object} The node found or null.
*/
var find = function(id) {
    var theMatch = null;

    // Loop our root.data array calling visitNode for each object
    _.each(root.data, function(obj) {
        // It seems there's no way to break out of _.each :(
        if(!theMatch) {
            var match = visitNode(obj, id);
            if(match) {
                theMatch = match;
            }
        }
    });
    return theMatch;
};



/**
* Updates a node's data property value given node ID passed in.
*
* @param {ID} ID of node being searched for.
* @return {Object} The node updated or null.
*/
var update = function(id, newData) {
    var theMatch = null;
    _.each(root.data, function(obj) {
        if(!theMatch) {
            var match = visitNode(obj, id);
            if(match) {
                match.data = newData;
                theMatch = match;
            }
        }
    });
    return theMatch;
};

/**
* Returns the path to a node by ID
*
* @param {ID} ID of node being searched for.
* @return {String} The path to the node e.g. '/wang/chung/have/fun'
*/
var path = function(id) {
    var separator = '/',
        p = separator,
        stop = false;

    _.each(root.data, function(obj) {
        var tmpPath = separator;

        var match = visitNode(obj, id, function(visitMessage){
            if(visitMessage === '__resolve__') { 
                stop = true;
            } 
            if(!stop) {
                tmpPath += visitMessage + separator;
            }
            if(visitMessage === '__reject__') { 
                tmpPath = separator + obj.data + separator; // start over
            }
        });
        if(match) {
            p = tmpPath;
        }
    });
    return p;
};

/**
* Returns whole tree structure from root.
*
* @return {Object} Tree structure.
*/
var getTree = function() {
    return root;
};
/**
* Tree is structured with an array of objects at the root level.
* This returns that array of objects.
*
* @return {Object} Array of root objects.
*/
var getRoots = function() {
    return root.data;   
};
/**
* Essentially empties the tree.
* @return {Object} The emptied tree.
*/
var clear = function() {
    root = {"data":[]};
    return root;
};

// Non destructively adds unique _id and marks isLeaf true||false
var normalize = function(n) {
    if(!n.hasOwnProperty('_id') || !n._id) {
        n._id = _.uniqueId('tax_');
    }
    if(!n.hasOwnProperty('attr') || !n.attr) {
        n.attr = {};
    }

    // If we have an id attribute and it's not the same as auto generated
    // id, let it take precedence (so attr.id beats n._id). This could cause 
    // problems if the user doesn't know what they're doing, but gives them 
    // more flexibility and control; and overwriting user defined id just doesn't
    // make any sense to me.
    if(typeof n.attr.id !== 'undefined' && n.attr.id !== n._id) {
        n._id = n.attr.id; 
    } else {
        // Probably the normal case so perhaps my conditional is ugly `:-)
        // jstree uses jQuery.attr for any defined. This will gives us element
        // ID's in our jstree which is nice for front end.
        n.attr.id = n._id;
    }
    if(!n.hasOwnProperty('children') || !n.children.length) {
        n.children = [];
        n.isLeaf = true;
    } else {
        n.isLeaf = false;
    }
    return n;
};
var callbackDefined = function(cb) {
    return (cb && typeof cb === 'function');
};
var visitNode = function (dataObj, id, cb) {
    var match = null, i, d, len, result;

    // Base condition .. object passed in has _id that matches so return it
    if(dataObj.hasOwnProperty('_id') && dataObj._id === id) {
        return dataObj;
    }

    // If the data object has children iterate them recursively
    if(dataObj.hasOwnProperty('children') && dataObj.children.length) {
        if(callbackDefined(cb)) {
            cb(dataObj.data);
        }

        for(i=0, len=dataObj.children.length; i<len; i++) {
            d = dataObj.children[i];
            result = visitNode(d, id, cb);

            // Once we find the match we need to signal
            // callback to ignore subsequent
            if(result && result._id === id) {
                match = result;
                if(callbackDefined(cb)) {
                    cb('__resolve__');
                }
                break;
            } else if (i===len-1) {
                if(callbackDefined(cb)) {
                    cb('__reject__');
                }
            }
        }
    }
    if(match) {
        return match;
    }
};
var visitParentChild = function (parent, id) {
    var match = null;

    function find(p, id) {
        if(p.hasOwnProperty('children') && p.children.length) {
            _.each(p.children, function(d, i) {
                if(!match && d.hasOwnProperty('_id')) {
                    if(d._id === id) {
                        match = {parent: p, child:d, position:i};
                    } else {
                        find(d, id);
                    }
                }
            });
        }
        if(match) { 
            return match;
        }
    }
    match = find(parent, id);
    return match;
};
var findParentChild = function (childId) {
    var theMatch = null;
    _.each(root.data, function(obj) {
        // If we've already found skip past..no break in underscore :(
        if(!theMatch) {
            var match = visitParentChild(obj, childId);
            if(match) {
                theMatch = match;
            }
        }
    });
    return theMatch;
};
module.exports = {
    addNode         : addNode,
    createNode      : createNode,
    find            : find,
    insert          : insert,
    update          : update,
    remove          : remove,
    path            : path,
    findParentChild : findParentChild,
    getTree         : getTree,
    getRoots        : getRoots,
    clear           : clear
};
