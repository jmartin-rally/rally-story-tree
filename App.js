/*global console, Ext */
Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [{
        xtype: 'container',
        itemId: 'artifacts'
    }],
    typeMap: {
        'hierarchicalrequirement': { text: "Stories", icon: "https://rally1.rallydev.com/slm/images/icon_story.gif" },
        'task': { text: "Tasks", icon: "https://audemo.rallydev.com/slm/images/icon_task.gif" },
        'defect': { text: "Defects", icon: "https://audemo.rallydev.com/slm/images/icon_defect.gif" }
    },
    launch: function() {
        this.wait = new Ext.LoadMask( Ext.getBody(), {msg: "Loading data..." } );
        this._getStories();
    },
    _getStories: function() {
        this.wait.show();
        var that = this;
        
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'User Story',
            limit: Infinity,
            listeners: {
                load: function(store,data,success) {
                    var records = [];
                    var record_hash = {};
                    
                    Ext.Array.each(data, function(record) {
                        var tree_item = {
                            isChild: false,
                            text: record.data.FormattedID + ": " + record.data.Name,
                            _ref: record.data._ref,
                            icon: that.typeMap[ record.data._type].icon,
                            leaf: false,
                            allowDrop: true,
                            allowDrag: true,
                            data: { item: record.data },
                            ObjectID: record.data.ObjectID,
                            children: []
                        };
                        record_hash[ record.data._ref ] = tree_item;
                    });
                    // make holders for out-of-scope parents
                    Ext.Object.each( record_hash, function(key,item) {
                        if ( item.data.item.Parent ) {
                            if ( ! record_hash[ item.data.item.Parent._ref ] ) {
                                var parent = item.data.item.Parent;
                                parent.Children = [item];
                                record_hash[ item.data.item.Parent._ref ] = {
                                    outOfScope: true,
                                    isChild: false,
                                    text: "out of scope item",
                                    _ref: item.data.item.Parent._ref,
                                    leaf: false,
                                    allowDrop: false,
                                    allowDrag: false,
                                    data: { item: item.data.item.Parent },
                                    children: []
                                };
                            } else if ( record_hash[ item.data.item.Parent._ref ].outOfScope ) {
                                record_hash[item.data.item.Parent._ref].data.item.Children.push(item);
                            }
                        }
                    });
                    // hook up children
                    Ext.Object.each( record_hash, function(key,parent ) { 
                        var children = [];
                        Ext.Array.each( parent.data.item.Children, function( record ) {                            
                            if ( record_hash[ record._ref ] ) {
                                record_hash[ record._ref ].isChild = true;
                                children.push( record_hash[ record._ref ] ) ;
                            } else {
                                children.push( {
                                    isChild: true,
                                    text: "out of scope item",
                                    _ref: record._ref,
                                    leaf: true,
                                    allowDrop: false,
                                    allowDrag: false,
                                    data: { item: record },
                                    children: []
                                });
                            } 
                        });
                        parent.children = children;
                        records.push( parent );
                    });
                    
                    // Clean out duplicates
                    var clean_records = [];
                    Ext.Array.each( records, function( record ) {
                        if ( ! record.isChild ) { clean_records.push( record ); }
                    });
                                        
                    Ext.define( 'ArtifactTreeNodes', {
                        extend: 'Ext.data.Model',
                        fields: [
                            { name: 'text', type: 'string' },
                            { name: 'leaf', type: 'boolean' },
                            { name: 'icon', type: 'string' },
                            { name: 'allowDrop', type: 'boolean' },
                            { name: 'allowDrag', type: 'boolean' },
                            { name: '_ref', type: 'string' },
                            { name: 'ObjectID', type: 'int' }
                        ]
                    } );
                    
                    var artifact_store = Ext.create('Ext.data.TreeStore', {
                        model: "ArtifactTreeNodes",
                        root: {
                            allowDrop: false,
                            expanded: true,
                            children: clean_records
                        }
                    });    
                    
                    this._displayTree(artifact_store);
                },
                scope: this
            },
            autoLoad: true,
            sorters: [{property: 'Rank', direction: 'ASC' }]
        });
    },
    _displayTree: function(store) {
        this.artifact_tree = Ext.create('Ext.tree.Panel', {
            store: store,
            rootVisible: false,
            viewConfig: {
                plugins: {
                    ptype: 'treeviewdragdrop'
                },
                copy: false,
                listeners: {
                    drop: this._onDrop,
                    scope: this
                }
            }
        });
        this.down('#artifacts').add( this.artifact_tree );
        this.wait.hide();
    },
    _onDrop: function( node, data, overModel, dropPosition ) {
        var moved_item = data.view.getRecord( data.item ).data;
        var new_parent = overModel.data;
        
        Rally.data.ModelFactory.getModel({
            type: 'User Story',
            success: function( us_model ) {
                us_model.load( moved_item.ObjectID, {
                    fetch: [ 'FormattedID','Parent' ],
                    callback: function(record,operation) {
                        if ( operation.wasSuccessful() ) {
                            record.set( 'Parent', new_parent );
                            record.save({
                                callback: function(result,operation) {
                                    if ( operation.wasSuccessful() ) {
                                        //
                                    } else {
                                        Ext.Msg.alert('Problem Moving Record', operation.error.errors[0] );
                                        console.log( operation );
                                    }
                                }
                            });
                            console.log( record );
                        }
                    }
                });
            }
        });
    }
});
