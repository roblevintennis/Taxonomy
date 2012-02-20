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
    retObj._id = _.uniqueId('tax_') + new Date().getTime();
    return retObj;
};


/**
* Moves a node. Essentially, removes node then inserts node as child of parent node 
* with parentId at optional position. Note: This is NOT an atomic operation!
*
* @param {Object} Child node
* @param {Object} Parent ID for which we will add child to.
* @param {int} Optional position; index in parent's children array to place child node.
* @return {Object} The child node
*/
var move = function(node, parentId, position) {
	var removed = remove(node._id);
    var parentNode = find(parentId);
    return addNode(node, parentNode, position);
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
    return addNode(node, parentNode, position);
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
    } else {
		// Might be a root node?
		root.data = _.reject(root.data, function(obj) {
			if(childId === obj._id) {
				foundChild = true;
				return true;
			}
			return false;
		});
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
* Updates a node with newNode given the node ID passed in.
*
* @param {ID} ID of node being searched for.
* @return {Object} The node updated or null.
*/
var updateNode = function(id, newNode) {
	var theMatch = null;
	_.each(root.data, function(obj) {
		if(!theMatch) {
			var match = visitNode(obj, id);
			if(match) {
				match = newNode;
				theMatch = match;
			}
		}
	});
	return theMatch;
};

/**
* Returns the ID of node given a path
*
* @param {String} The path to the node e.g. '/wang/chung/have/fun'. Must
* be valid path, otherwise, results are undefined.
* @return {ID} ID of node being searched for.
*/
var findByPath = function(path) {
	var pathArray = path.split('/')

	// Get rid of first and last unmeaningful elements
	pathArray.shift();
	
	// if /path/to/trailing/forward-slash/ .. we get an extra element we
	// don't need .. so we just pop that off here
	if(path.lastIndexOf('/') === path.length-1) {
		pathArray.pop();
	}

	//_.each(root.data, function(obj) {
	for(var j=0, l=root.data.length; j<l; j++) {
		var clone = JSON.parse(JSON.stringify(root.data[j]));

		// First see if we have a root node matching
		// the first "dir" in provided path
		if(typeof clone.attr !== 'undefined' && clone.attr['data-slug'] == pathArray[0]) {

			// If path only has depth of one we've already found it
			if(pathArray.length == 1) {
				return clone._id;	
				break;
			} 
			else {
				// Now loop from second "dir" and see if any of the node's
				// children match
				clone = clone.children;
				if(clone) {
					for(var i=1, len=pathArray.length; i<len; i++) {
						for(var x=0, size=clone.length; x<size; x++) {

							if(typeof clone[x].attr !== 'undefined' && clone[x].attr['data-slug'] == pathArray[i]) {
								if(i== len-1) {
									return clone[x]._id;	
									break;
								} else {
									if(typeof clone[x] !== 'undefined') {
										clone = clone[x].children;
									}
								}
							}
						}
					}
				}
			}
		} else {
			continue;	
		}
	}
	return null;
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
* Sets the tree with data params passed in.
* @param {Object} The tree to set.
* Returns whole tree structure from root.
*
* @return {Object} Tree structure.
*/
var setTree = function(data) {
    root = data;
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

var normalizeSlug = function normalizeSlug(raw) {
	var str = raw.replace(/^\s+|\s+$/g, "").replace(/\s+/g,' ');
	str = str.split(' ').join('-').toLowerCase().replace(/[^a-zA-Z0-9_\-]+/g,'');
	return str;
}

// Non destructively adds unique _id and marks isLeaf true||false
var normalize = function(n) {

    if(!n.hasOwnProperty('_id') || !n._id) {
        n._id = _.uniqueId('tax_') + new Date().getTime();
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

    if(typeof n.attr['data-slug'] === 'undefined') {
		if(typeof n.data === 'string') {
			n.attr['data-slug'] = normalizeSlug(n.data);
		} 
		else if(typeof n.data === 'number') {
			n.attr['data-slug'] = n.data;
		}
    } else {
		// We still need to normalize the user provided slug
		if(typeof n.attr['data-slug'] === 'string') {
			n.attr['data-slug'] = normalizeSlug(n.attr['data-slug']);
		} 
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


/**
* Builds nested markup representing the taxonomy currently set.
* @param {Object} options: 
*	outerTag (e.g. 'ul', 'ol', etc.')
*	innerTag (e.g. 'li')
*	startPath; default is '/#!' so if you're not using ajax crawlable
*	hash tags you need to set this to empty string like: startPath:''
* @return {String} The markup built. 
*/
var render = function (options) {
	var arr  = [];
	var outerTag = (options && options.outerTag) ? options.outerTag : 'ul';
	var innerTag = (options && options.innerTag) ? options.innerTag  : 'li';
	var startPath = (options && options.startPath)   ? options.startPath : '/#!';	
	var start     = '<';
	var close     = '>';
	var closetag  = '/';
	walk({
		start_el:   function(node) {
			arr.push(start+innerTag+' class="sid_'+node._id+'"'+ close);	
			var nodeslug = (node.attr && node.attr['data-slug']) ? node.attr['data-slug'] : '';
			var nodedata = (node.data) ? node.data : (
				(nodeslug) ? nodeslug : ''
			);

			// Just using pre-existing path function .. I know, I know!! ;)
			// Essentially following does: /#! + /path/to/the/ + section
			var cpath = startPath + path(node._id) +nodeslug;
			arr.push('<a href="'+cpath+'" title="View all under '+nodeslug+'">'+nodedata+"</a>");
		},
		end_el:   function(node) {
			arr.push(start+closetag+innerTag+close);	
		},
		start_lvl: function(level) {
			arr.push(start+outerTag+ ' class="level-'+level+'"'+ close);	
		},
		end_lvl: function(level) {
			arr.push(start+closetag+outerTag+close);	
		},
	});
	return arr.join('');
};

/**
* Traverses tree calling back the hooks as appropriate. Used by render.
* @param {Object} options: 
* start_el - when start element encountered
* end_el - when end element encountered
* start_lvl - when starting a level of nesting
* end_lvl - when ending of a level nesting
* Note, while implemented quite differently, the concepts for the hooks
* are influenced by Wordpress's Walker class:
* http://codex.wordpress.org/Function_Reference/Walker_Class
* http://core.trac.wordpress.org/browser/trunk/wp-includes/class-wp-walker.php
*/
var walk = function (options, maxdepth) {
	var start_el, end_el, start_lvl, end_lvl; // homage to WP ;-)
	var defined           = callbackDefined,
		startLevelsCalled = [],
		endLevelsCalled   = [];

	if(!root || !root.data) return null;

	if(options && options.start_el) {
		start_el = options.start_el;
	}
	if(options && options.end_el) {
		end_el = options.end_el;
	}
	if(options && options.start_lvl) {
		start_lvl = options.start_lvl;
	}
	if(options && options.end_lvl) {
		end_lvl = options.end_lvl;
	}

	if(defined(start_lvl)) {
		start_lvl(1);
	}

	// For each root node, we hit any callbacks, and then 
	// use recursive visit helper to recurse any children
	_.each(root.data, function(node) {
		if(node && node.data) {
			if(defined(start_el)) {
				start_el(node);
			}
		}
		visit(node, 2); // going to level 2
		if(node && node.data) {
			if(defined(end_el)) {
				end_el(node);
			}
		}
	});

	if(defined(end_lvl)) {
		end_lvl(1);
	}

	// Visit all children of a root node
	function visit(node, level) {
		var d = null;
		// Base case .. no children
		if(!node) return null;
		if(!node.hasOwnProperty('children') || !node.children.length) {
			return null;
		} 
		else {
			if(defined(start_lvl)) {
				start_lvl(level);
			}
			// For each child
			for(var i=0, len=node.children.length; i<len; i++) {
				d = node.children[i];
				if(defined(start_el)) {
					start_el(d);
				}
				// Searches to level not greater than n from the current directory or [path]
				if(maxdepth===level) {
					return null;
				}

				visit(d, level+1);
				if(defined(end_el)) {
					end_el(d);
				}
			}
			if(defined(end_lvl)) {
				end_lvl(level);
			}
		}
	}
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
	findByPath      : findByPath,
    path            : path,
    insert          : insert,
    update          : update,
    updateNode      : updateNode,
    remove          : remove,
    move            : move,
    findParentChild : findParentChild,
    getTree         : getTree,
    setTree         : setTree,
    getRoots        : getRoots,
    clear           : clear,
    render          : render,
    walk            : walk 
};
