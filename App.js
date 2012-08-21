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
                    console.log( data );
                    var records = [];
                    var record_hash = {};
                    
                    Ext.Array.each(data, function(record) {
                        var tree_item = {
                            isChild: false,
                            text: record.data.FormattedID + ": " + record.data.Name,
                            _ref: record.data._ref,
                            icon: that.typeMap[ record.data._type].icon,
                            leaf: true,
                            allowDrop: true,
                            data: { item: record.data },
                            children: []
                        };
                        record_hash[ record.data._ref ] = tree_item;
                    });
                    
                    // hook up children
                    Ext.Object.each( record_hash, function(key,parent ) { 
                        console.log( key, parent );
                        var children = [];
                        Ext.Array.each( parent.data.item.Children, function( record ) {
                            parent.leaf = false; 
                            
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
                    
                    console.log( records );
                    
                    Ext.define( 'ArtifactTreeNodes', {
                        extend: 'Ext.data.Model',
                        fields: [
                            { name: 'text', type: 'string' },
                            { name: 'leaf', type: 'boolean' },
                            { name: 'icon', type: 'string' },
                            { name: 'allowDrop', type: 'boolean' },
                            { name: '_ref', type: 'string' }
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
            rootVisible: false
        });
        this.down('#artifacts').add( this.artifact_tree );
        this.wait.hide();
    }
});
