/*
 * Copyright (c) 2011-2016 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Class to create a panel for displaying the R plot for the trending of retention times, peak areas, and other
 * values for the selected graph parameters.
 *
 * To add PDF export support use LABKEY.vis.SVGConverter.convert.
 */
Ext4.define('LABKEY.targetedms.QCTrendPlotPanel', {

    extend: 'LABKEY.targetedms.BaseQCPlotPanel',
    mixins: {helper: 'LABKEY.targetedms.QCPlotHelperWrapper'},
    header: false,
    border: false,
    labelAlign: 'left',
    items: [],
    defaults: {
        xtype: 'panel',
        border: false
    },

    // properties specific to this TargetedMS QC plot implementation
    yAxisScale: 'linear',
    metric: null,
    plotTypes: ['Levey-Jennings'], //TODO select LJ only for existing tests
    largePlot: false,
    dateRangeOffset: 0,
    minAcquiredTime: null,
    maxAcquiredTime: null,
    startDate: null,
    endDate: null,
    groupedX: false,
    singlePlot: false,
    plotWidth: null,
    enableBrushing: false,
    havePlotOptionsChanged: false,

    // Max number of plots/series to show
    maxCount: 50,

    initComponent : function() {
        Ext4.tip.QuickTipManager.init();

        this.callParent();

        // min and max acquired date must be provided
        if (this.minAcquiredTime == null || this.maxAcquiredTime == null)
            Ext4.get(this.plotDivId).update("<span class='labkey-error'>Unable to render report. Missing min and max AcquiredTime from data query.</span>");
        else
            this.queryInitialQcMetrics(this.queryInitialPlotOptions, this);
    },

    queryInitialPlotOptions : function()
    {
        // If there are URL parameters (i.e. from Pareto Plot click), set those as initial values as well.
        LABKEY.Ajax.request({
            url: LABKEY.ActionURL.buildURL('targetedms', 'leveyJenningsPlotOptions.api'),
            scope: this,
            success: LABKEY.Utils.getCallbackWrapper(function(response)
            {
                // convert the boolean and integer values from strings
                var initValues = {};
                Ext4.iterate(response.properties, function(key, value)
                {
                    if (value === "true" || value === "false")
                    {
                        value = value === "true";
                    }
                    else if (value != undefined && value.length > 0 && !isNaN(Number(value)))
                    {
                        value = +value;
                    }
                    else if (key == 'plotTypes') // convert string to array
                    {
                        value = value.split(',');
                    }
                    initValues[key] = value;
                });

                // apply any URL parameters to the initial values
                Ext4.apply(initValues, this.getInitialValuesFromUrlParams());

                this.initPlotForm(initValues);
            }, this, false)
        });
    },

    calculateStartDateByOffset : function()
    {
        if (this.dateRangeOffset > 0)
        {
            var todayMinusOffset = new Date();
            todayMinusOffset.setDate(todayMinusOffset.getDate() - this.dateRangeOffset);
            return todayMinusOffset;
        }

        return this.minAcquiredTime;
    },

    calculateEndDateByOffset : function()
    {
        if (this.dateRangeOffset > 0)
            return new Date();

        return this.maxAcquiredTime;
    },

    initPlotForm : function(initValues)
    {
        // apply the initial values to the panel object so they are used in form field initialization
        Ext4.apply(this, initValues);

        // if we have a dateRangeOffset, we need to calculate the start and end date
        if (this.dateRangeOffset > -1)
        {
            this.startDate = this.formatDate(this.calculateStartDateByOffset());
            this.endDate = this.formatDate(this.calculateEndDateByOffset());
        }

        // initialize the form panel toolbars and display the plot
        this.add(this.initPlotFormToolbars());

        this.displayTrendPlot();
    },

    initPlotFormToolbars : function()
    {
        return [
            { tbar: this.getMainPlotOptionsToolbar() },
            { tbar: this.getCustomDateRangeToolbar() },
            { tbar: this.getPlotTypeOptionsToolbar() },
            { tbar: this.getOtherPlotOptionsToolbar() },
            { tbar: this.getGuideSetMessageToolbar() }
        ];
    },

    getPlotTypeOptionsToolbar: function()
    {
        var plotTypeCheckBoxes = [];
        Ext4.each(LABKEY.targetedms.BaseQCPlotPanel.qcPlotTypes, function(plotType){
            plotTypeCheckBoxes.push({
                boxLabel: plotType,
                name: 'plotTypes',
                inputValue: plotType,
                cls: 'qc-plot-type-checkbox',
                checked: this.isPlotTypeSelected(plotType)
            });
        }, this);
        var plotSizeRadio = [{
            boxLabel  : 'Small',
            name      : 'largePlot',
            inputValue: false,
            checked   : !this.largePlot
        },{
            boxLabel  : 'Large',
            name      : 'largePlot',
            inputValue: true,
            checked   : this.largePlot
        }];

        if (!this.plotTypeOptionsToolbar)
        {
            var me = this;
            this.plotTypeOptionsToolbar = Ext4.create('Ext.toolbar.Toolbar', {
                ui: 'footer',
                cls: 'levey-jennings-toolbar',
                padding: 10,
                layout: { pack: 'center' },
                items: [{
                    xtype: 'radiogroup',
                    fieldLabel: 'Plot Size',
                    columns: 2,
                    width: 180,
                    items: plotSizeRadio,
                    cls: 'plot-size-radio-group',
                    listeners: {
                        scope: this,
                        change: function(cmp, newVal, oldVal)
                        {
                            this.largePlot = newVal.largePlot;
                            this.havePlotOptionsChanged = true;

                            me.setBrushingEnabled(false);
                            me.displayTrendPlot();
                        }
                    }
                },{xtype: 'tbspacer'}, {xtype: 'tbseparator'}, {xtype: 'tbspacer'},{
                    xtype: 'checkboxgroup',
                    fieldLabel: 'QC Plot Type',
                    columns: 4,
                    items: plotTypeCheckBoxes,
                    cls: 'plot-type-checkbox-group',
                    listeners: {
                        scope: this,
                        change: function(cmp, newVal, oldVal)
                        {
                            this.plotTypes = newVal.plotTypes ? Ext4.isArray(newVal.plotTypes) ? newVal.plotTypes : [newVal.plotTypes] : [];
                            this.havePlotOptionsChanged = true;

                            me.setBrushingEnabled(false);
                            me.displayTrendPlot();
                        }
                    }
                }],
                listeners: {
                    scope: this,
                    render: function(cmp)
                    {
                        cmp.doLayout();
                    }
                }
            });
        }

        return this.plotTypeOptionsToolbar;
    },

    getMainPlotOptionsToolbar : function()
    {
        if (!this.mainPlotOptionsToolbar)
        {
            this.mainPlotOptionsToolbar = Ext4.create('Ext.toolbar.Toolbar', {
                ui: 'footer',
                cls: 'levey-jennings-toolbar',
                padding: 10,
                layout: { pack: 'center' },
                items: [
                    this.getMetricCombo(),
                    {xtype: 'tbspacer'}, {xtype: 'tbseparator'}, {xtype: 'tbspacer'},
                    this.getDateRangeCombo()
                ]
            });
        }

        return this.mainPlotOptionsToolbar;
    },

    getOtherPlotOptionsToolbar : function()
    {
        if (!this.otherPlotOptionsToolbar)
        {
            var  toolbarItems = [
                this.getScaleCombo(), {xtype: 'tbspacer'},
                {xtype: 'tbseparator'}, {xtype: 'tbspacer'},
                this.getGroupedXCheckbox(), {xtype: 'tbspacer'},
                {xtype: 'tbseparator'}, {xtype: 'tbspacer'},
                this.getSinglePlotCheckbox(), {xtype: 'tbspacer'}
            ];

            // only add the create guide set button if the user has the proper permissions to insert/update guide sets
            if (this.canUserEdit())
            {
                toolbarItems.push({xtype: 'tbspacer'}, {xtype: 'tbseparator'}, {xtype: 'tbspacer'});
                toolbarItems.push(this.getGuideSetCreateButton());
            }

            this.otherPlotOptionsToolbar = Ext4.create('Ext.toolbar.Toolbar', {
                ui: 'footer',
                cls: 'levey-jennings-toolbar',
                layout: { pack: 'center' },
                padding: '0 10px 10px 10px',
                items: toolbarItems
            });
        }

        return this.otherPlotOptionsToolbar;
    },

    getCustomDateRangeToolbar : function()
    {
        if (!this.customDateRangeToolbar)
        {
            this.customDateRangeToolbar = Ext4.create('Ext.toolbar.Toolbar', {
                ui: 'footer',
                cls: 'levey-jennings-toolbar',
                padding: '0 10px 10px 10px',
                hidden: this.dateRangeOffset > -1,
                layout: { pack: 'center' },
                items: [
                    this.getStartDateField(), {xtype: 'tbspacer'},
                    this.getEndDateField(), {xtype: 'tbspacer'},
                    this.getApplyDateRangeButton()
                ]
            });
        }

        return this.customDateRangeToolbar;
    },

    getGuideSetMessageToolbar : function()
    {
        if (!this.guideSetMessageToolbar)
        {
            this.guideSetMessageToolbar = Ext4.create('Ext.toolbar.Toolbar', {
                ui: 'footer',
                cls: 'guideset-toolbar-msg',
                hidden: true,
                layout: { pack: 'center' },
                items: [{
                    xtype: 'box',
                    itemId: 'GuideSetMessageToolBar',
                    html: 'Please click and drag in the plot to select the guide set training date range.'
                }]
            });
        }

        return this.guideSetMessageToolbar;
    },

    getInitialValuesFromUrlParams : function()
    {
        var urlParams = LABKEY.ActionURL.getParameters(),
            paramValues = {},
            alertMessage = '', sep = '',
            paramValue,
            metric;

        paramValue = urlParams['metric'];
        if (paramValue != undefined)
        {
            metric = this.validateMetricId(paramValue);
            if(metric == null)
            {
                alertMessage += "Invalid Metric, reverting to default metric.";
                sep = ' ';
            }
            else
            {
                paramValues['metric'] = metric;
            }
        }

        if (urlParams['startDate'] != undefined)
        {
            paramValue = new Date(urlParams['startDate']);
            if(paramValue == "Invalid Date")
            {
                alertMessage += sep + "Invalid Start Date, reverting to default start date.";
                sep = ' ';
            }
            else
            {
                paramValues['dateRangeOffset'] = -1; // force to custom date range selection
                paramValues['startDate'] = this.formatDate(paramValue);
            }
        }

        if (urlParams['endDate'] != undefined)
        {
            paramValue = new Date(urlParams['endDate']);
            if(paramValue == "Invalid Date")
            {
                alertMessage += sep + "Invalid End Date, reverting to default end date.";
            }
            else
            {
                paramValues['dateRangeOffset'] = -1; // force to custom date range selection
                paramValues['endDate'] = this.formatDate(paramValue);
            }
        }

        paramValue = urlParams['plotTypes'];
        if (paramValue != undefined)
        {
            var plotTypes = [];
            if (Ext4.isArray(paramValue))
            {
                Ext4.each(paramValue, function(value){
                    if (LABKEY.targetedms.BaseQCPlotPanel.isValidQCPlotType(value.trim()))
                        plotTypes.push(value.trim());
                });
            }
            else
            {
                var values = paramValue.split(',');
                Ext4.each(values, function(value){
                    if (LABKEY.targetedms.BaseQCPlotPanel.isValidQCPlotType(value.trim()))
                        plotTypes.push(value.trim());
                });

            }

            if(plotTypes.length == 0)
            {
                alertMessage += sep + "Invalid Plot Type, reverting to default plot type.";
            }
            else
            {
                paramValues['plotTypes'] = plotTypes;
            }
        }

        paramValue = urlParams['largePlot'];
        if (paramValue !== undefined && paramValue !== null)
        {
            paramValues['largePlot'] = paramValue.toString().toLowerCase() === 'true';
        }

        if (alertMessage.length > 0)
        {
            LABKEY.Utils.alert('Invalid URL Parameter(s)', alertMessage);
        }
        else if (Object.keys(paramValues).length > 0)
        {
            this.havePlotOptionsChanged = true;
            return paramValues;
        }

        return null;
    },

    validateMetricId : function(id)
    {
        for (var i = 0; i < this.metricPropArr.length; i++)
        {
            if (this.metricPropArr[i].id == id)
            {
                return this.metricPropArr[i].id;
            }
        }
        return null;
    },

    getScaleCombo : function()
    {
        if (!this.scaleCombo)
        {
            this.scaleCombo = Ext4.create('Ext.form.field.ComboBox', {
                id: 'scale-combo-box',
                width: 155,
                labelWidth: 80,
                fieldLabel: 'Y-Axis Scale',
                triggerAction: 'all',
                mode: 'local',
                store: Ext4.create('Ext.data.ArrayStore', {
                    fields: ['value', 'display'],
                    data: [['linear', 'Linear'], ['log', 'Log']]
                }),
                valueField: 'value',
                displayField: 'display',
                value: this.yAxisScale,
                forceSelection: true,
                editable: false,
                listeners: {
                    scope: this,
                    change: function(cmp, newVal, oldVal)
                    {
                        this.yAxisScale = newVal;
                        this.havePlotOptionsChanged = true;

                        // call processPlotData instead of renderPlots so that we recalculate min y-axis scale for log
                        this.setLoadingMsg();
                        this.processPlotData();
                    }
                }
            });
        }

        return this.scaleCombo;
    },

    getDateRangeCombo : function()
    {
        if (!this.dateRangeCombo)
        {
            this.dateRangeCombo = Ext4.create('Ext.form.field.ComboBox', {
                id: 'daterange-combo-box',
                width: 190,
                labelWidth: 75,
                fieldLabel: 'Date Range',
                triggerAction: 'all',
                mode: 'local',
                store: Ext4.create('Ext.data.ArrayStore', {
                    fields: ['value', 'display'],
                    data: [
                        [0, 'All dates'],
                        [7, 'Last 7 days'],
                        [15, 'Last 15 days'],
                        [30, 'Last 30 days'],
                        [90, 'Last 90 days'],
                        [180, 'Last 180 days'],
                        [365, 'Last 365 days'],
                        [-1, 'Custom range']
                    ]
                }),
                valueField: 'value',
                displayField: 'display',
                value: this.dateRangeOffset,
                forceSelection: true,
                editable: false,
                listeners: {
                    scope: this,
                    change: function(cmp, newVal, oldVal)
                    {
                        this.dateRangeOffset = newVal;
                        this.havePlotOptionsChanged = true;

                        var showCustomRangeItems = this.dateRangeOffset == -1;
                        this.getCustomDateRangeToolbar().setVisible(showCustomRangeItems);

                        if (!showCustomRangeItems)
                        {
                            // either use the min and max values based on the data
                            // or calculate range based on today's date and the offset
                            this.startDate = this.formatDate(this.calculateStartDateByOffset());
                            this.endDate = this.formatDate(this.calculateEndDateByOffset());

                            this.setBrushingEnabled(false);
                            this.displayTrendPlot();
                        }
                    }
                }
            });
        }

        return this.dateRangeCombo;
    },

    getStartDateField : function()
    {
        if (!this.startDateField)
        {
            this.startDateField = Ext4.create('Ext.form.field.Date', {
                id: 'start-date-field',
                width: 180,
                labelWidth: 65,
                fieldLabel: 'Start Date',
                value: this.startDate,
                allowBlank: false,
                format: 'Y-m-d',
                listeners: {
                    scope: this,
                    validitychange: function (df, isValid)
                    {
                        this.getApplyDateRangeButton().setDisabled(!isValid);
                    }
                }
            });
        }

        return this.startDateField;
    },

    getEndDateField : function()
    {
        if (!this.endDateField)
        {
            this.endDateField = Ext4.create('Ext.form.field.Date', {
                id: 'end-date-field',
                width: 175,
                labelWidth: 60,
                fieldLabel: 'End Date',
                value: this.endDate,
                allowBlank: false,
                format: 'Y-m-d',
                listeners: {
                    scope: this,
                    validitychange: function (df, isValid)
                    {
                        this.getApplyDateRangeButton().setDisabled(!isValid);
                    }
                }
            });
        }

        return this.endDateField;
    },

    getApplyDateRangeButton : function()
    {
        if (!this.applyFilterButton)
        {
            this.applyFilterButton = Ext4.create('Ext.button.Button', {
                text: 'Apply',
                handler: this.applyGraphFilterBtnClick,
                scope: this
            });
        }

        return this.applyFilterButton;
    },

    assignDefaultMetricIfNull: function ()
    {
        if (this.metric == null || isNaN(Number(this.metric)))
        {
            this.metric = this.metricPropArr[0].id;
        }
        else if (!this.getMetricPropsById(this.metric))
        {
            console.log("The chart type with id " + this.metric + " is no longer available.");
            this.metric = this.metricPropArr[0].id;
            console.log("Using default chart type with id " + this.metric + ".");
        }
    },

    getMetricCombo : function()
    {
        if (!this.metricField)
        {
            this.assignDefaultMetricIfNull();
            
            this.metricField = Ext4.create('Ext.form.field.ComboBox', {
                id: 'metric-type-field',
                width: 340,
                labelWidth: 70,
                fieldLabel: 'Metric',
                triggerAction: 'all',
                mode: 'local',
                store: Ext4.create('Ext.data.Store', {
                    fields: ['id', 'name'],
                    sorters: [{property: 'name'}],
                    data: this.metricPropArr
                }),
                valueField: 'id',
                displayField: 'name',
                value: this.metric,
                forceSelection: true,
                editable: false,
                listeners: {
                    scope: this,
                    change: function(cmp, newVal, oldVal)
                    {
                        this.metric = newVal;
                        this.havePlotOptionsChanged = true;

                        this.setBrushingEnabled(false);
                        this.displayTrendPlot();
                    }
                }
            });
        }

        return this.metricField;
    },

    getGroupedXCheckbox : function()
    {
        if (!this.groupedXCheckbox)
        {
            this.groupedXCheckbox = Ext4.create('Ext.form.field.Checkbox', {
                id: 'grouped-x-field',
                boxLabel: 'Group X-Axis Values by Date',
                checked: this.groupedX,
                listeners: {
                    scope: this,
                    change: function(cb, newValue, oldValue)
                    {
                        this.groupedX = newValue;
                        this.havePlotOptionsChanged = true;

                        this.setBrushingEnabled(false);
                        this.setLoadingMsg();
                        this.getAnnotationData();
                    }
                }
            });
        }

        return this.groupedXCheckbox;
    },

    getSinglePlotCheckbox : function()
    {
        if (!this.peptidesInSinglePlotCheckbox)
        {
            this.peptidesInSinglePlotCheckbox = Ext4.create('Ext.form.field.Checkbox', {
                id: 'peptides-single-plot',
                boxLabel: 'Show All Series in a Single Plot',
                checked: this.singlePlot,
                listeners: {
                    scope: this,
                    change: function(cb, newValue, oldValue)
                    {
                        this.singlePlot = newValue;
                        this.havePlotOptionsChanged = true;

                        this.setBrushingEnabled(false);
                        this.setLoadingMsg();
                        this.getAnnotationData();
                    }
                }
            });
        }

        return this.peptidesInSinglePlotCheckbox;
    },

    getGuideSetCreateButton : function()
    {
        if (!this.createGuideSetToggleButton)
        {
            this.createGuideSetToggleButton = Ext4.create('Ext.button.Button', {
                text: 'Create Guide Set',
                tooltip: 'Enable/disable guide set creation mode',
                disabled: this.groupedX || this.singlePlot || this.isMultiSeries(),
                enableToggle: true,
                handler: function(btn) {
                    this.setBrushingEnabled(btn.pressed);
                },
                scope: this
            });
        }

        return this.createGuideSetToggleButton;
    },

    setBrushingEnabled : function(enabled) {
        // we don't currently allow creation of guide sets in single plot mode, grouped x-axis mode, or multi series mode
        this.getGuideSetCreateButton().setDisabled(this.groupedX || this.singlePlot || this.isMultiSeries());

        this.enableBrushing = enabled;
        this.clearPlotBrush();
        this.setPlotBrushingDisplayStyle();
        this.toggleGuideSetMsgDisplay();
        this.getGuideSetCreateButton().toggle(enabled);
    },

    setLoadingMsg : function() {
        Ext4.get(this.plotDivId).update("");
        Ext4.get(this.plotDivId).mask("Loading...");
    },

    displayTrendPlot: function() {
        this.setLoadingMsg();
        this.getDistinctPrecursors();
    },

    getMetricPropsById: function(id) {
        for (var i = 0; i < this.metricPropArr.length; i++) {
            if (this.metricPropArr[i].id == id) {
                return this.metricPropArr[i];
            }
        }
        return undefined;
    },

    getDistinctPrecursors: function() {

        this.assignDefaultMetricIfNull();

        var metricProps = this.getMetricPropsById(this.metric);

        var series1Sql = "SELECT SeriesLabel FROM " + metricProps.series1SchemaName + "." + metricProps.series1QueryName,
            series2Sql = this.isMultiSeries() ? " UNION SELECT SeriesLabel FROM " + metricProps.series2SchemaName + "." + metricProps.series2QueryName : '',
            separator = ' WHERE ';

        // CAST as DATE to ignore time portion of value
        if (this.startDate)
        {
            series1Sql += separator + "CAST(SampleFileId.AcquiredTime AS DATE) >= '" + this.startDate + "'";
            if (series2Sql.length > 0)
                series2Sql += separator + "CAST(SampleFileId.AcquiredTime AS DATE) >= '" + this.startDate + "'";

            separator = " AND ";
        }
        if (this.endDate)
        {
            series1Sql += separator + "CAST(SampleFileId.AcquiredTime AS DATE) <= '" + this.endDate + "'";
            if (series2Sql.length > 0)
                series2Sql += separator + "CAST(SampleFileId.AcquiredTime AS DATE) <= '" + this.endDate + "'";
        }

        var sql = "SELECT DISTINCT SeriesLabel FROM (\n" + series1Sql + series2Sql + "\n) X ORDER BY SeriesLabel";

        LABKEY.Query.executeSql({
            schemaName: 'targetedms',
            sql: sql,
            scope: this,
            success: function(data) {

                // stash the set of precursor series labels for use with the plot rendering
                this.precursors = [];
                if (data.rows.length > this.maxCount) {
                    Ext4.get(this.countLimitedDivId).update("Limiting display to the first " + this.maxCount + " precursors out of " + data.rows.length + " total");
                    Ext4.get(this.countLimitedDivId).setStyle("display", "block");
                }
                else {
                    Ext4.get(this.countLimitedDivId).update("");
                    Ext4.get(this.countLimitedDivId).setStyle("display", "none");
                }

                for (var i = 0; i < Math.min(data.rows.length, this.maxCount); i++) {
                    this.precursors.push(data.rows[i].SeriesLabel);
                }

                this.getAnnotationData();
            },
            failure: this.failureHandler
        });
    },

    getAnnotationData: function() {
        var config = this.getReportConfig();

        var annotationSql = "SELECT qca.Date, qca.Description, qca.Created, qca.CreatedBy.DisplayName, qcat.Name, qcat.Color FROM qcannotation qca JOIN qcannotationtype qcat ON qcat.Id = qca.QCAnnotationTypeId";

        // Filter on start/end dates
        var separator = " WHERE ";
        if (config.StartDate) {
            annotationSql += separator + "Date >= '" + config.StartDate + "'";
            separator = " AND ";
        }
        if (config.EndDate) {
            annotationSql += separator + "Date <= '" + config.EndDate + "'";
        }

        LABKEY.Query.executeSql({
            schemaName: 'targetedms',
            sql: annotationSql,
            sort: 'Date',
            containerFilter: LABKEY.Query.containerFilter.currentPlusProjectAndShared,
            scope: this,
            success: this.processAnnotationData,
            failure: this.failureHandler
        });
    },

    processAnnotationData: function(data) {
        this.annotationData = data.rows;
        this.annotationShape = LABKEY.vis.Scale.Shape()[4]; // 0: circle, 1: triangle, 2: square, 3: diamond, 4: X

        var dateCount = {};
        this.legendData = [];

        // if we are showing the All Peptides plot, add a legend header for annotations
        if (this.annotationData.length > 0 && this.singlePlot)
        {
            this.legendData.push({
                text: 'Annotations',
                separator: true
            });
        }

        for (var i = 0; i < this.annotationData.length; i++)
        {
            var annotation = this.annotationData[i];
            var annotationDate = this.formatDate(new Date(annotation['Date']), !this.groupedX);

            // track if we need to stack annotations that fall on the same date
            if (!dateCount[annotationDate]) {
                dateCount[annotationDate] = 0;
            }
            annotation.yStepIndex = dateCount[annotationDate];
            dateCount[annotationDate]++;

            // get unique annotation names and colors for the legend
            if (Ext4.Array.pluck(this.legendData, "text").indexOf(annotation['Name']) == -1)
            {
                this.legendData.push({
                    text: annotation['Name'],
                    color: '#' + annotation['Color'],
                    shape: this.annotationShape
                });
            }
        }

        this.prepareAndRenderQCPlot();
    },

    getExportSVGStr: function(btn)
    {
        var svgStr = this.callParent([btn]);

        // issue 25066: pdf export has artifact of the brush resize handlers
        svgStr = svgStr.replace('class="e-resize-handle-rect"', 'class="e-resize-handle-rect" visibility="hidden"');
        svgStr = svgStr.replace('class="w-resize-handle-rect"', 'class="w-resize-handle-rect" visibility="hidden"');

        return svgStr;
    },

    showInvalidLogMsg : function(id, toShow)
    {
        if (toShow)
        {
            Ext4.get(id).update("<span style='font-style: italic;'>Log scale invalid for values &le; 0. "
                    + "Reverting to linear y-axis scale.</span>");
        }
    },

    plotHoverTextDisplay : function(row, valueName){
        return (row[valueName + 'Title'] != undefined ? 'Metric: ' + row[valueName + 'Title'] + '\n' : '')
            + row.dataType + ': ' + row['fragment']
            + '\nAcquired: ' + row['fullDate'] + ", "
            + '\nValue: ' + (valueName ? row[valueName] : row.value) + ", "
            + '\nFile Path: ' + row['FilePath'];
    },

    plotPointClick : function(event, row) {
        //Chose action target based on precursor type
        var action = row.dataType == 'Peptide' ? "precursorAllChromatogramsChart" : "moleculePrecursorAllChromatogramsChart";

        var url = LABKEY.ActionURL.buildURL('targetedms', action, LABKEY.ActionURL.getContainer(), {
                    id: row.PrecursorId,
                    chromInfoId: row.PrecursorChromInfoId
                });

        window.location = url + '#ChromInfo' + row.PrecursorChromInfoId;
    },

    plotBrushStartEvent : function(plot) {
        this.clearPlotBrush(plot);
    },

    plotBrushEvent : function(extent, plot, layers) {
        Ext4.each(layers, function(layer){
            var points = layer.selectAll('.point path');
            if (points[0].length > 0)
            {
                var colorAcc = function(d) {
                    var x = plot.scales.x.scale(d.seqValue);
                    d.isInSelection = (x > extent[0][0] && x < extent[1][0]);
                    return d.isInSelection ? 'rgba(20, 204, 201, 1)' : '#000000';
                };

                points.attr('fill', colorAcc).attr('stroke', colorAcc);
            }
        });
    },

    plotBrushEndEvent : function(data, extent, plot) {
        var selectedPoints = Ext4.Array.filter(data, function(point){ return point.isInSelection; });
        this.plotBrushSelection = {plot: plot, points: selectedPoints};

        // add the guide set create and cancel buttons over the brushed region
        if (selectedPoints.length > 0)
        {
            var me = this;
            var xMid = extent[0][0] + (extent[1][0] - extent[0][0]) / 2;

            var createBtn = this.createGuideSetSvgButton(plot, 'Create', xMid - 57, 50);
            createBtn.on('click', function() {
                me.createGuideSetBtnClick();
            });

            var cancelBtn = this.createGuideSetSvgButton(plot, 'Cancel', xMid + 3, 49);
            cancelBtn.on('click', function () {
                me.clearPlotBrush(plot);
                plot.clearBrush();
                me.setBrushingEnabled(false);
            });

            this.bringSvgElementToFront(plot, "g.guideset-svg-button");
        }
    },

    plotBrushClearEvent : function(data, plot) {
        this.plotBrushSelection = undefined;
    },

    canUserEdit : function() {
        return LABKEY.user.canInsert && LABKEY.user.canUpdate;
    },

    allowGuideSetBrushing : function() {
        return this.canUserEdit() && !this.groupedX;
    },

    createGuideSetSvgButton : function(plot, text, xLeftPos, width) {
        var yRange = plot.scales.yLeft.range;
        var yTopPos = yRange[1] + (yRange[0] - yRange[1]) / 2 - 10;

        var svgBtn = this.getSvgElForPlot(plot).append('g')
                .attr('class', 'guideset-svg-button');

        svgBtn.append('rect')
                .attr('x', xLeftPos).attr('y', yTopPos).attr('rx', 5).attr('ry', 5)
                .attr('width', width).attr('height', 20)
                .style({'fill': '#ffffff', 'stroke': '#b4b4b4'});

        svgBtn.append('text').text(text)
                .attr('x', xLeftPos + 5).attr('y', yTopPos + 14)
                .style({'fill': '#126495', 'font-size': '10px', 'font-weight': 'bold', 'text-transform': 'uppercase'});

        return svgBtn;
    },

    setPlotBrushingDisplayStyle : function() {
        // hide the brushing related components for all plots if not in "create guide set" mode
        var displayStyle = this.enableBrushing ? 'inline' : 'none';
        d3.selectAll('.brush').style({'display': displayStyle});
        d3.selectAll('.x-axis-handle').style({'display': displayStyle});
    },

    clearPlotBrush : function(plot) {
        // clear any create/cancel buttons and brush areas from other plots
        if (this.plotBrushSelection) {
            this.getSvgElForPlot(this.plotBrushSelection.plot).selectAll(".guideset-svg-button").remove();

            if (this.plotBrushSelection.plot != plot) {
                this.plotBrushSelection.plot.clearBrush();
            }
        }
    },

    getSvgElForPlot : function(plot) {
        return d3.select('#' + plot.renderTo + ' svg');
    },

    toggleGuideSetMsgDisplay : function() {
        var toolbarMsg = this.down('#GuideSetMessageToolBar');
        toolbarMsg.up('toolbar').setVisible(this.enableBrushing);
    },

    addGuideSetTrainingRangeToPlot : function(plot, precursorInfo) {
        var me = this;
        var guideSetTrainingData = [];

        // find the x-axis starting and ending index based on the guide set information attached to each data point
        Ext4.Object.each(this.guideSetDataMap, function(guideSetId, guideSetData)
        {
            // only compare guide set info for matching precursor fragment
            if (!this.singlePlot && guideSetData.Series[precursorInfo.fragment] == undefined) {
                return true; // continue
            }

            var gs = {GuideSetId: guideSetId};
            for (var j = 0; j < precursorInfo.data.length; j++)
            {
                // only use data points that match the GuideSet RowId and are in the training set range
                if (precursorInfo.data[j].guideSetId == gs.GuideSetId && precursorInfo.data[j].inGuideSetTrainingRange)
                {
                    if (gs.StartIndex == undefined)
                    {
                        gs.StartIndex = precursorInfo.data[j].seqValue;
                    }
                    gs.EndIndex = precursorInfo.data[j].seqValue;
                }
            }

            if (gs.StartIndex != undefined)
            {
                guideSetTrainingData.push(gs);
            }
        }, this);

        if (guideSetTrainingData.length > 0)
        {
            // add a "shaded" rect to indicate which points in the plot are part of the guide set training range
            var binWidth = (plot.grid.rightEdge - plot.grid.leftEdge) / (plot.scales.x.scale.domain().length);
            var yRange = plot.scales.yLeft.range;

            var xAcc = function (d) {
                return plot.scales.x.scale(d.StartIndex) - (binWidth/2);
            };

            var widthAcc = function (d) {
                return plot.scales.x.scale(d.EndIndex) - plot.scales.x.scale(d.StartIndex) + binWidth;
            };

            var guideSetTrainingRange = this.getSvgElForPlot(plot).selectAll("rect.training").data(guideSetTrainingData)
                .enter().append("rect").attr("class", "training")
                .attr('x', xAcc).attr('y', yRange[1])
                .attr('width', widthAcc).attr('height', yRange[0] - yRange[1])
                .attr('stroke', '#000000').attr('stroke-opacity', 0.1)
                .attr('fill', '#000000').attr('fill-opacity', 0.1);

            guideSetTrainingRange.append("title").text(function (d) {
                var guideSetInfo = me.guideSetDataMap[d.GuideSetId],
                    seriesGuideSetInfo = guideSetInfo.Series[precursorInfo.fragment],
                    numRecs = seriesGuideSetInfo ? seriesGuideSetInfo.NumRecords : 0,
                    showGuideSetStats = !me.singlePlot && numRecs > 0,
                    mean, stdDev, percentCV;

                if (showGuideSetStats)
                {
                    mean = me.formatNumeric(seriesGuideSetInfo.Mean);
                    stdDev = me.formatNumeric(seriesGuideSetInfo.StandardDev);
                    percentCV = me.formatNumeric((stdDev / mean) * 100);
                }

                return "Guide Set ID: " + d.GuideSetId + ","
                    + "\nStart: " + me.formatDate(new Date(guideSetInfo.TrainingStart), true)
                    + ",\nEnd: " + me.formatDate(new Date(guideSetInfo.TrainingEnd), true)
                    + (showGuideSetStats ? ",\n# Runs: " + numRecs : "")
                    + (showGuideSetStats ? ",\nMean: " + mean : "")
                    + (showGuideSetStats ? ",\nStd Dev: " + stdDev : "")
                    + (showGuideSetStats ? ",\n%CV: " + percentCV : "")
                    + (guideSetInfo.Comment ? (",\nComment: " + guideSetInfo.Comment) : "");
            });
        }

        this.bringSvgElementToFront(plot, "g.error-bar");
        this.bringSvgElementToFront(plot, "path");
        this.bringSvgElementToFront(plot, "a.point");
        this.bringSvgElementToFront(plot, "rect.extent");
    },

    bringSvgElementToFront: function(plot, selector) {
        this.getSvgElForPlot(plot).selectAll(selector)
            .each(function() {
               this.parentNode.parentNode.appendChild(this.parentNode);
            });
    },

    addAnnotationsToPlot: function(plot, precursorInfo) {
        var me = this;

        var xAxisLabels = Ext4.Array.pluck(precursorInfo.data, "fullDate");
        if (this.groupedX)
        {
            xAxisLabels = [];

            // determine the annotation index based on the "date" but unique values are based on "groupedXTick"
            var prevGroupedXTick = null;
            Ext4.each(precursorInfo.data, function(row)
            {
                if (row['groupedXTick'] != prevGroupedXTick)
                {
                    xAxisLabels.push(row['date']);
                }
                prevGroupedXTick = row['groupedXTick'];
            });
        }

        // use direct D3 code to inject the annotation icons to the rendered SVG
        var xAcc = function(d) {
            var annotationDate = me.formatDate(new Date(d['Date']), !me.groupedX);
            return plot.scales.x.scale(xAxisLabels.indexOf(annotationDate));
        };
        var yAcc = function(d) {
            return plot.scales.yLeft.range[1] - (d['yStepIndex'] * 12) - 12;
        };
        var transformAcc = function(d){
            return 'translate(' + xAcc(d) + ',' + yAcc(d) + ')';
        };
        var colorAcc = function(d) {
            return '#' + d['Color'];
        };
        var annotations = this.getSvgElForPlot(plot).selectAll("path.annotation").data(this.annotationData)
            .enter().append("path").attr("class", "annotation")
            .attr("d", this.annotationShape(5)).attr('transform', transformAcc)
            .style("fill", colorAcc).style("stroke", colorAcc);

        // add hover text for the annotation details
        annotations.append("title")
            .text(function(d) {
                return "Created By: " + d['DisplayName'] + ", "
                    + "\nDate: " + me.formatDate(new Date(d['Date']), true) + ", "
                    + "\nDescription: " + d['Description'];
            });

        // add some mouseover effects for fun
        var mouseOn = function(pt, strokeWidth) {
            d3.select(pt).transition().duration(800).attr("stroke-width", strokeWidth).ease("elastic");
        };
        var mouseOff = function(pt) {
            d3.select(pt).transition().duration(800).attr("stroke-width", 1).ease("elastic");
        };
        annotations.on("mouseover", function(){ return mouseOn(this, 3); });
        annotations.on("mouseout", function(){ return mouseOff(this); });
    },

    formatDate: function(d, includeTime) {
        if (d instanceof Date) {
            if (includeTime) {
                return Ext4.util.Format.date(d, 'Y-m-d H:i:s');
            }
            else {
                return Ext4.util.Format.date(d, 'Y-m-d');
            }
        }
        else {
            return d;
        }
    },

    formatNumeric: function(val) {
        if (LABKEY.vis.isValid(val)) {
            if (val > 100000 || val < -100000) {
                return val.toExponential(3);
            }
            return parseFloat(val.toFixed(3));
        }
        return "N/A";
    },

    getReportConfig: function() {
        var config = { metric: this.metric };

        if (this.startDate) {
            config['StartDate'] = this.formatDate(this.startDate);
        }
        if (this.endDate) {
            config['EndDate'] = this.formatDate(this.endDate);
        }

        return config;
    },

    applyGraphFilterBtnClick: function() {
        var startDateRawValue = this.getStartDateField().getRawValue(),
            startDateValue = this.getStartDateField().getValue(),
            endDateRawValue = this.getEndDateField().getRawValue(),
            endDateValue = this.getEndDateField().getValue();

        // make sure that at least one filter field is not null
        if (startDateRawValue == '' && endDateRawValue == '')
        {
            Ext4.Msg.show({
                title:'ERROR',
                msg: 'Please enter a value for filtering.',
                buttons: Ext4.Msg.OK,
                icon: Ext4.MessageBox.ERROR
            });
        }
        // verify that the start date is not after the end date
        else if (startDateValue > endDateValue && endDateValue != '')
        {
            Ext4.Msg.show({
                title:'ERROR',
                msg: 'Please enter an end date that does not occur before the start date.',
                buttons: Ext4.Msg.OK,
                icon: Ext4.MessageBox.ERROR
            });
        }
        else
        {
            // get date values without the time zone info
            this.startDate = startDateRawValue;
            this.endDate = endDateRawValue;
            this.havePlotOptionsChanged = true;

            this.setBrushingEnabled(false);
            this.displayTrendPlot();
        }
    },

    createGuideSetBtnClick: function() {
        var minGuideSetPointCount = 5; // to warn user if less than this many points are selected for the new guide set

        if (this.plotBrushSelection && this.plotBrushSelection.points.length > 0)
        {
            var startDate = this.plotBrushSelection.points[0]['fullDate'];
            var endDate = this.plotBrushSelection.points[this.plotBrushSelection.points.length - 1]['fullDate'];

            if (this.plotBrushSelection.points.length < minGuideSetPointCount) {
                Ext4.Msg.show({
                    title:'Create Guide Set Warning',
                    icon: Ext4.MessageBox.WARNING,
                    msg: 'Fewer than ' + minGuideSetPointCount + ' data points were selected for the new guide set, which may not be statistically significant. Would you like to proceed anyway?',
                    buttons: Ext4.Msg.YESNO,
                    scope: this,
                    fn: function(btnId, text, opt){
                        if(btnId == 'yes'){
                            this.insertNewGuideSet(startDate, endDate);
                        }
                    }
                });
            }
            else {
                this.insertNewGuideSet(startDate, endDate);
            }
        }
    },

    insertNewGuideSet : function(startDate, endDate) {
        LABKEY.Query.insertRows({
            schemaName: 'targetedms',
            queryName: 'GuideSet',
            rows: [{TrainingStart: startDate, TrainingEnd: endDate}],
            success: function(data) {
                this.plotBrushSelection = undefined;
                this.setBrushingEnabled(false);

                // issue 26019: since guide sets won't be created that often and we now remember plot option selections,
                // force page reload for new guide set creation this allows the sample file information to be updated
                // easily in the QC Summary webpart (which is commonly displayed on the same page as this plot).
                window.location.reload();
            },
            failure: function(response) {
                Ext4.Msg.show({
                    title:'Error Creating Guide Set',
                    icon: Ext4.MessageBox.ERROR,
                    msg: response.exception,
                    buttons: Ext4.Msg.OK
                });
            },
            scope: this
        })
    },

    persistSelectedFormOptions : function()
    {
        if (this.havePlotOptionsChanged)
        {
            this.havePlotOptionsChanged = false;
            LABKEY.Ajax.request({
                url: LABKEY.ActionURL.buildURL('targetedms', 'leveyJenningsPlotOptions.api'),
                params: this.getSelectedPlotFormOptions()
            });
        }
    },

    getSelectedPlotFormOptions : function()
    {
        var props = {
            metric: this.metric,
            plotTypes: this.plotTypes,
            largePlot: this.largePlot,
            yAxisScale: this.yAxisScale,
            groupedX: this.groupedX,
            singlePlot: this.singlePlot,
            dateRangeOffset: this.dateRangeOffset
        };

        // set start and end date to null unless we are
        props.startDate = this.dateRangeOffset == -1 ? this.formatDate(this.startDate) : null;
        props.endDate = this.dateRangeOffset == -1 ? this.formatDate(this.endDate) : null;

        return props;
    },

    getMaxStackedAnnotations : function() {
        if (this.annotationData.length > 0) {
            return Math.max.apply(Math, (Ext4.Array.pluck(this.annotationData, "yStepIndex"))) + 1;
        }
        return 0;
    },

    isMultiSeries : function()
    {
        if (Ext4.isNumber(this.metric))
        {
            var metricProps = this.getMetricPropsById(this.metric);
            return Ext4.isDefined(metricProps.series2SchemaName) && Ext4.isDefined(metricProps.series2QueryName);
        }
        return false;
    },

    getColorRange: function()
    {
        return LABKEY.vis.Scale.ColorDiscrete().concat(LABKEY.vis.Scale.DarkColorDiscrete());
    }

});