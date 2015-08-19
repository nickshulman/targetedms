/**
 *
 * Copyright (c) 2015 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 *
 * Created by binalpatel on 8/7/15.
 */

Ext4.define('LABKEY.targetedms.LinkVersionsDialog', {

    extend: 'Ext.panel.Panel',
    title: 'Linked Document Details',
    modal: true,
    border: false,
    width: 800,
    minHeight: 200,
    autoScroll: true,
    resizable: false,
    layout: 'fit',

    statics: {
        showLinkVersionDialog : function() {
            LABKEY.DataRegion.getSelected({
                selectionKey: LABKEY.DataRegions.TargetedMSRuns.selectionKey,
                success: function(selection) {
                    Ext4.create('LABKEY.targetedms.LinkVersionsDialog', {
                        selectedRowIds : selection.selected
                    });
                }
            });
        }
    },

    constructor: function(config) {
        if(!Ext4.isArray(config.selectedRowIds))
        {
            console.error("'selectedRowIds' is not an array.");
            return;
        }
        if(!Ext4.isDefined(config.selectedRowIds))
        {
            console.error("'selectedRowIds' is not defined.");
            return;
        }
        if(config.selectedRowIds.length < 2)
        {
            console.error("'selectedRowIds' array length should be greater than 2. At least two documents should be selected.");
            return;
        }

        this.callParent([config]);
    },

    initComponent : function()
    {
        // query to get all runs associated with the selected runs, i.e. already in a linked chain with the selected runs
        LABKEY.Ajax.request({
            url: LABKEY.ActionURL.buildURL('targetedms', 'getLinkVersions.api', null, {selectedRowIds: this.selectedRowIds}),
            scope: this,
            success: LABKEY.Utils.getCallbackWrapper(function(response) {
                this.selectedRowIds = response.linkedRowIds;

                LABKEY.Query.selectRows({
                    schemaName: 'targetedms',
                    queryName: 'targetedmsruns',
                    columns: this.getLinkedDocumentColumnNames(),
                    scope: this,
                    filterArray: [LABKEY.Filter.create('rowId', this.selectedRowIds.join(';'), LABKEY.Filter.Types.IN)],
                    success: this.showLinkedDocumentWindow,
                    failure: this.failureHandler
                });
            }, this, false)
        });

        this.callParent();
    },

    getLinkedDocumentGridCoumns : function(data) {
        return [
            {
                xtype: 'templatecolumn',
                text: 'Remove',
                width: 67,
                align: 'center',
                menuDisabled: true,
                sortable: false,
                draggable: false,
                tpl: '<span class="fa fa-times"></span>',
                hidden: Ext.isDefined(data) ? data.rows.length < 3 : true
            },
            // These 'dataIndex' look into the model
            {text: 'Document Name', dataIndex: 'File/FileName', flex: 3, menuDisabled: true, sortable: false},
            {text: 'Imported', dataIndex: 'Created', xtype: 'datecolumn', format: 'm/d/Y', width: 105, menuDisabled: true, sortable: false},
            {text: 'Imported By', dataIndex: 'CreatedBy/DisplayName', width: 100, menuDisabled: true, sortable: false},
            {text: 'Note', dataIndex: 'Flag/Comment', width: 185, menuDisabled: true, sortable: false},
            {text: 'Proteins', dataIndex: 'File/PeptideGroupCount', width: 67, menuDisabled: false, sortable: false, align: 'right'},
            {text: 'Precursors', dataIndex: 'File/PrecursorCount', width: 85, menuDisabled: true, sortable: false, align: 'right'},
            {text: 'Transitions', dataIndex: 'File/TransitionCount', width: 87, menuDisabled: true, sortable: false, align: 'right'},
            {text: 'Replaced By', dataIndex: 'ReplacedByRun', hidden: true}
        ];
    },

    getLinkedDocumentColumnNames : function() {
        var fields = Ext4.Array.pluck(this.getLinkedDocumentGridCoumns(), 'dataIndex');
        fields.shift(); // remove the first element as it will be undefined
        return fields;
    },

    getLinkedDocumentGrid : function(data) {
        return Ext4.create('Ext.grid.Panel', {
            padding: 15,
            width: 950,
            maxHeight: 300,
            autoScoll: true,
            store: Ext4.create('Ext.data.Store', {
                fields: this.getLinkedDocumentColumnNames(),
                sorters: [{property: 'Created', direction: 'ASC'}],
                data: data
            }),
            viewConfig: {
                plugins: {
                    ptype: 'gridviewdragdrop',
                    dragText: 'Drag and drop to reorder.'
                },
                getRowClass: function(record, index) {
                    // add CSS class to those rows that are in an existing chain, so we can style them to stand out
                    var replacedBy = record.get('ReplacedByRun');
                    if (Ext4.isDefined(replacedBy) && replacedBy > 0) {
                        return 'link-version-exists';
                    }
                }
            },
            columns: this.getLinkedDocumentGridCoumns(data),
            listeners: {
                scope: this,
                cellclick: function(grid, td, cellIndex, record, tr, rowIndex, e) {
                    // 'Remove' column listener to remove a record from the grid store
                    if (cellIndex == 0 && e.target.className == 'fa fa-times') {
                        var store = grid.getStore();
                        store.remove(record);

                        // only allow removing a row if there are > 2 items in the store
                        if (store.getCount() < 3) {
                            grid.getHeaderAtIndex(0).hide();
                        }
                    }
                }
            }
        });
    },

    showLinkedDocumentWindow : function(data)
    {
        var grid = this.getLinkedDocumentGrid(data);

        // if we have a run that is part of an existing chain, the sum of the ReplacedByRun column will be > 0
        var footerText = 'Drag and drop the documents to reorder the chain.';
        if (grid.getStore().sum('ReplacedByRun') > 0) {
            footerText += ' <span>Bold</span> indicates a document that is part of an existing method chain. Saving will replace any existing association.';
        }

        var win = Ext4.create('Ext.window.Window', {
            title: 'Link Versions',
            border: false,
            autoShow: true,
            items: [grid],
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'bottom',
                ui: 'footer',
                padding: '0 10px 15px 15px',
                items: [{
                    xtype: 'box',
                    cls: 'link-version-footer',
                    width: 750,
                    html: footerText
                },'->',{
                    text: 'Save',
                    width: 75,
                    scope: this,
                    handler: function() {
                        this.saveLinkedDocumentVersions(win);
                    }
                },{
                    text: 'Cancel',
                    width: 75,
                    handler: function() {
                        win.close();
                    }
                }]
            }]
        });
    },

    saveLinkedDocumentVersions : function(win) {

        var store = win.down('grid').getStore(),
            orderedRecords = store.getRange(),
            updateRows = [];

        // traverse the ordered records to get replacedByRunIds, note: must have at least 2 records
        if (orderedRecords.length > 1) {
            for (var i = 0; i < orderedRecords.length - 1; i++) {
                updateRows.push({
                    RowId: orderedRecords[i].get('RowId'),
                    ReplacedByRun: orderedRecords[i+1].get('RowId') // next record in the store
                });
            }
        }

        if (updateRows.length > 0) {
            win.getEl().mask('Saving...');
            LABKEY.Ajax.request({
                url: LABKEY.ActionURL.buildURL('targetedms', 'saveLinkVersions.api'),
                method: 'POST',
                jsonData: {runs: updateRows},
                headers: { 'Content-Type' : 'application/json' },
                success: LABKEY.Utils.getCallbackWrapper(function(response) {
                    //close the dialog and reload the page
                    win.close();
                    window.location.reload();
                }, this, false),
                failure: LABKEY.Utils.getCallbackWrapper(function(response) {
                    LABKEY.Utils.alert("Error", response.exception);
                    win.getEl().unmask();
                }, this, true)
            });
        }
    }
});
