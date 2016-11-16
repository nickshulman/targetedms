/*
 * Copyright (c) 2015-2016 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0
 */
Ext4.define('LABKEY.targetedms.BaseQCPlotPanel', {

    extend: 'Ext.panel.Panel',

    // properties used for the various data queries based on chart metric type
    metricPropArr: [],

    getMetricPropsById: function(id) {
        for (var i = 0; i < this.metricPropArr.length; i++) {
            if (this.metricPropArr[i].id == id) {
                return this.metricPropArr[i];
            }
        }
        return undefined;
    },

    isMultiSeries : function(metricId)
    {
        var metric = Ext4.isNumber(this.metric) ? this.metric : metricId;
        if (Ext4.isNumber(metric))
        {
            var metricProps = this.getMetricPropsById(metric);
            return Ext4.isDefined(metricProps.series2SchemaName) && Ext4.isDefined(metricProps.series2QueryName);
        }
        return false;
    },

    metricGuideSetSql : function(schema1Name, query1Name, schema2Name, query2Name)
    {
        var includeCalc = !Ext4.isDefined(schema2Name) && !Ext4.isDefined(query2Name),
            selectCols = 'SampleFileId, SampleFileId.AcquiredTime, SeriesLabel' + (includeCalc ? ', MetricValue' : ''),
            series1SQL = 'SELECT ' + selectCols + ' FROM '+ schema1Name + '.' + query1Name,
            series2SQL = includeCalc ? '' : ' UNION SELECT ' + selectCols + ' FROM '+ schema2Name + '.' + query2Name;

        return 'SELECT gs.RowId AS GuideSetId, gs.TrainingStart, gs.TrainingEnd, gs.ReferenceEnd, p.SeriesLabel, '
            + '\nCOUNT(p.SampleFileId) AS NumRecords, '
            + '\n' + (includeCalc ? 'AVG(p.MetricValue)' : 'NULL') + ' AS Mean, '
            + '\n' + (includeCalc ? 'STDDEV(p.MetricValue)' : 'NULL') + ' AS StandardDev '
            + '\nFROM guideset gs'
            + '\nLEFT JOIN (' + series1SQL + series2SQL + ') as p'
            + '\n  ON p.AcquiredTime >= gs.TrainingStart AND p.AcquiredTime <= gs.TrainingEnd'
            + '\nGROUP BY gs.RowId, gs.TrainingStart, gs.TrainingEnd, gs.ReferenceEnd, p.SeriesLabel';
    },

    metricGuideSetRawSql : function(schema1Name, query1Name, schema2Name, query2Name)
    {
        var includeCalc = !Ext4.isDefined(schema2Name) && !Ext4.isDefined(query2Name),
                selectCols = 'SampleFileId, SampleFileId.AcquiredTime, SeriesLabel' + (includeCalc ? ', MetricValue' : ''),
                series1SQL = 'SELECT ' + selectCols + ' FROM '+ schema1Name + '.' + query1Name,
                series2SQL = includeCalc ? '' : ' UNION SELECT ' + selectCols + ' FROM '+ schema2Name + '.' + query2Name;

        return 'SELECT gs.RowId AS GuideSetId, gs.TrainingStart, gs.TrainingEnd, gs.ReferenceEnd, p.SeriesLabel, p.AcquiredTime ' + (includeCalc ? ', p.MetricValue' : '')
                + '\nFROM guideset gs'
                + '\nLEFT JOIN (' + series1SQL + series2SQL + ') as p'
                + '\n  ON p.AcquiredTime >= gs.TrainingStart AND p.AcquiredTime <= gs.TrainingEnd'
                + '\n ORDER BY GuideSetId, p.SeriesLabel, p.AcquiredTime'; //it's important that record is sorted by AcquiredTime asc as ordering is critical in calculating mR
    },

    getEachSeriesTypePlotDataSql: function (type, metricProps, whereClause, metricName)
    {
        var schema = metricProps[type + 'SchemaName'],
                query = metricProps[type + 'QueryName'];
        var sql = "SELECT '" + type + "' AS SeriesType, ";
        if (metricName)
        {
            sql +=  "'" + metricName + "'"  + " AS MetricName, ";
        }
        sql += "\nX.PrecursorId, X.PrecursorChromInfoId, X.SeriesLabel, X.DataType, X.AcquiredTime,"
                + "\nX.FilePath, X.MetricValue, gs.RowId AS GuideSetId,"
                + "\nCASE WHEN (X.AcquiredTime >= gs.TrainingStart AND X.AcquiredTime <= gs.TrainingEnd) THEN TRUE ELSE FALSE END AS InGuideSetTrainingRange"
                + "\nFROM (SELECT *, SampleFileId.AcquiredTime AS AcquiredTime, SampleFileId.FilePath AS FilePath"
                + "\n      FROM " + schema + '.' + query + whereClause + ") X "
                + "\nLEFT JOIN guideset gs"
                + "\nON ((X.AcquiredTime >= gs.TrainingStart AND X.AcquiredTime < gs.ReferenceEnd) OR (X.AcquiredTime >= gs.TrainingStart AND gs.ReferenceEnd IS NULL))"
                + "\nORDER BY X.SeriesLabel, SeriesType, X.AcquiredTime"; //it's important that record is sorted by AcquiredTime asc as ordering is critical in calculating mR and CUSUM
        return '(' + sql + ')';
    },

    getSeriesTypePlotDataSql: function(seriesTypes, metricProps, whereClause, MetricName)
    {
        var sql = "", sep = "";
        Ext4.each(seriesTypes, function (type)
        {
            sql += sep;
            sql += this.getEachSeriesTypePlotDataSql(type, metricProps, whereClause, MetricName);
            sep = "\nUNION\n";
        }, this);
        sql = "SELECT * FROM (" + sql + ") a ORDER BY SeriesType, SeriesLabel, AcquiredTime"; //it's important that record is sorted by AcquiredTime asc as ordering is critical in calculating mR and CUSUM
        return sql;
    },

    getGuideSetAvgMRs : function(data, isLogScale)
    {
        var movingRangeMap = {}, guideSetDataMap = {};
        Ext4.each(data.rows, function(row) {
            var guideSetId = row['GuideSetId'];
            if (!guideSetDataMap[guideSetId])
            {
                guideSetDataMap[guideSetId] = {
                    Series: {}
                };
            }

            var seriesLabel = row['SeriesLabel'];
            if (!guideSetDataMap[guideSetId].Series[seriesLabel])
            {
                guideSetDataMap[guideSetId].Series[seriesLabel] = {
                    MetricValues: []
                };
            }
            guideSetDataMap[guideSetId].Series[seriesLabel].MetricValues.push(row.MetricValue); //data.rows should already be sorted by AcquiredTime
        }, this);

        Ext4.iterate(guideSetDataMap, function(guideSetId, setVal){
            movingRangeMap[guideSetId] = {Series: {}};
            var series = setVal.Series;
            Ext4.iterate(series, function(seriesLabel, seriesVal){
                var metricVals = seriesVal.MetricValues;
                if (metricVals == null || metricVals.length == 0)
                    return;
                var metricMovingRanges = LABKEY.vis.Stat.getMovingRanges(metricVals, isLogScale);
                movingRangeMap[guideSetId].Series[seriesLabel] = LABKEY.vis.Stat.getMean(metricMovingRanges);
            });
        });
        return movingRangeMap;
    },

    preprocessPlotData: function(plotDataRows, hasMR, hasCUSUMm, hasCUSUMv, isLogScale) {
        var plotDataMap = {};
        for (var i = 0; i < plotDataRows.length; i++)
        {
            var row = plotDataRows[i];
            if (!plotDataMap[row['SeriesLabel']])
            {
                plotDataMap[row['SeriesLabel']] = {
                    Series: {}
                };
            }
            if (!plotDataMap[row['SeriesLabel']].Series[row['SeriesType']])
            {
                plotDataMap[row['SeriesLabel']].Series[row['SeriesType']] = {
                    Rows: [],
                    MetricValues: []
                };
            }
            plotDataMap[row['SeriesLabel']].Series[row['SeriesType']].MetricValues.push(row.MetricValue);
            plotDataMap[row['SeriesLabel']].Series[row['SeriesType']].Rows.push(row);
        }

        if (hasMR || hasCUSUMm || hasCUSUMv)
        {
            Ext4.iterate(plotDataMap, function(seriesLabel, seriesVal){
                Ext4.iterate(seriesVal.Series, function(seriesType, seriesTypeObj){
                    var mRs, positiveCUSUMm, negativeCUSUMm, positiveCUSUMv, negativeCUSUMv;
                    if (hasMR)
                        mRs = LABKEY.vis.Stat.getMovingRanges(seriesTypeObj.MetricValues, isLogScale);
                    if (hasCUSUMm)
                    {
                        positiveCUSUMm = LABKEY.vis.Stat.getCUSUM(seriesTypeObj.MetricValues, false, false, isLogScale);
                        negativeCUSUMm = LABKEY.vis.Stat.getCUSUM(seriesTypeObj.MetricValues, true, false, isLogScale);
                    }
                    if (hasCUSUMv)
                    {
                        positiveCUSUMv = LABKEY.vis.Stat.getCUSUM(seriesTypeObj.MetricValues, false, true, isLogScale);
                        negativeCUSUMv = LABKEY.vis.Stat.getCUSUM(seriesTypeObj.MetricValues, true, true, isLogScale);
                    }
                    for (var i = 0; i < seriesTypeObj.Rows.length; i++)
                    {
                        var row = seriesTypeObj.Rows[i];
                        if (hasMR)
                            row['MR'] = mRs[i];
                        if (hasCUSUMm)
                        {
                            row['CUSUMmP'] = positiveCUSUMm[i];
                            row['CUSUMmN'] = negativeCUSUMm[i];
                        }
                        if (hasCUSUMv)
                        {
                            row['CUSUMvP'] = positiveCUSUMv[i];
                            row['CUSUMvN'] = negativeCUSUMv[i];
                        }
                    }
                })
            });
        }
        return plotDataMap;
    },

    addPlotWebPartToPlotDiv: function (id, title, div, wp)
    {
        Ext4.get(div).insertHtml('beforeEnd', '<br/>' +
                '<table class="labkey-wp ' + wp + '">' +
                ' <tr class="labkey-wp-header">' +
                '     <th class="labkey-wp-title-left">' +
                '        <span class="labkey-wp-title-text ' +  wp + '-title">'+ Ext4.util.Format.htmlEncode(title) +
                '           <div class="plot-export-btn" id="' + id + '-exportToPDFbutton"></div>' +
                '        </span>' +
                '     </th>' +
                ' </tr><tr>' +
                '     <td class="labkey-wp-body"><div id="' + id + '"></div></</td>' +
                ' </tr>' +
                '</table>'
        );
    },

    addPlotsToPlotDiv: function(ids, title, div, wp)
    {
        if (this.largePlot)
            this.addLargePlotsToPlotDiv(ids, title, div, wp);
        else
            this.addSmallPlotsToPlotDiv(ids, title, div, wp);
    },

    addLargePlotsToPlotDiv: function (ids, title, div, wp)
    {
        var html = '<br/>' +
                '<table class="labkey-wp ' + wp + '">' +
                ' <tr class="labkey-wp-header">' +
                '     <th class="labkey-wp-title-left">' +
                '        <span class="labkey-wp-title-text ' +  wp + '-title">'+ Ext4.util.Format.htmlEncode(title) +
                '           <span class="plot-export-btn-group">' +
                '           <div class="plot-export-btn" id="' + ids[0] + '-exportToPDFbutton"></div>' +
                '           </span>' +
                '        </span>' +
                '     </th>' +
                ' </tr>';

        Ext4.each(ids, function(plotId){
            html += '<tr>' +
                    '     <td><div id="' + plotId + '"></div></td>' +
                    ' </tr>';
        });
        html += '</table>';
        Ext4.get(div).insertHtml('beforeEnd', html);
    },

    addSmallPlotsToPlotDiv: function (ids, title, div, wp)
    {
        var html = '<br/>' +
                '<table class="labkey-wp ' + wp + '">' +
                ' <tr class="labkey-wp-header">' +
                '     <th class="labkey-wp-title-left">' +
                '        <span class="labkey-wp-title-text ' +  wp + '-title">'+ Ext4.util.Format.htmlEncode(title) +
                '           <span class="plot-export-btn-group">' +
                '           <div class="plot-export-btn" id="' + ids[0] + '-exportToPDFbutton"></div>' +
                '           </span>' +
                '        </span>' +
                '     </th>' +
                ' </tr>';

        if (ids.length > 0)
        {
            html += ' <tr>' +
                    '     <td><div class="plot-small-layout" id="' + ids[0] + '"></div>';
            if (ids.length > 1)
                html += '<div class="plot-small-layout" id="' + ids[1] + '"></div>';
            html += ' </td></tr>';
        }

        if (ids.length > 2)
        {
            html += ' <tr>' +
                    '     <td><div class="plot-small-layout" id="' + ids[2] + '"></div>';
            if (ids.length > 3)
                html += '<div class="plot-small-layout" id="' + ids[3] + '"></div>';
            html += ' </td></tr>';
        }
        html += '</table>';
        Ext4.get(div).insertHtml('beforeEnd', html);
    },

    setPlotWidth: function (div)
    {
        if (this.plotWidth == null)
        {
            // set the width of the plot webparts based on the first labkey-wp-body element
            this.plotWidth = 900;
            var wp = document.querySelector('.labkey-wp-body');
            if (wp && (wp.clientWidth - 20) > this.plotWidth)
            {
                this.plotWidth = wp.clientWidth - 20;
            }

            Ext4.get(div).setWidth(this.plotWidth);
        }
    },

    createExportToPDFButton: function (id, title, filename)
    {
        new Ext4.Button({
            renderTo: id + "-exportToPDFbutton",
            svgDivId: id,
            icon: LABKEY.contextPath + "/_icons/pdf.gif",
            tooltip: "Export PDF of this plot",
            handler: function (btn)
            {
                LABKEY.vis.SVGConverter.convert(this.getExportSVGStr(btn.svgDivId), LABKEY.vis.SVGConverter.FORMAT_PDF, filename);
            },
            scope: this
        });
    },

    getPlotPdfMenuItem: function(divId, filename, plotType, extraMargin, scope)
    {
        return {
            xtype: 'menuitem',
            text: plotType,
            listeners: {
                click: {
                    fn: function ()
                    {
                        LABKEY.vis.SVGConverter.convert(scope.getExportSVGStr(divId, extraMargin), LABKEY.vis.SVGConverter.FORMAT_PDF, filename);
                    },
                    element: 'el',
                    scope: scope
                }
            }
        }
    },

    getPlotPdfMenuItems:function(divIds, filename, extraMargin) {
        this.plotTypes.sort(function(a, b){
            return LABKEY.targetedms.QCPlotHelperBase.qcPlotTypesOrders[a] - LABKEY.targetedms.QCPlotHelperBase.qcPlotTypesOrders[b];
        });
        var plotIndex = 0, menuItems = [], me = this;
        Ext4.each(this.plotTypes, function(plotType){
            menuItems.push(me.getPlotPdfMenuItem(divIds[plotIndex], filename, plotType, extraMargin, me));
            plotIndex++;
        });
        return menuItems;
    },

    getExportPlotToPDFMenu: function(divIds, filename, extraMargin)
    {
        return Ext4.create('Ext.menu.Menu', {
            plain: true,
            cls: 'toolsMenu',
            floating: true,
            items: this.getPlotPdfMenuItems(divIds, filename, extraMargin),
            listeners:{
                render: function(tool) {
                    this.showBy(tool, 'tr-br?');
                },
                hide: function(tool) {
                    tool.destroy();
                },
                scope:this
            }
        });

    },

    //extraMargin for invisible legends
    createExportPlotToPDFButton: function (id, title, filename, isMenu, ids, extraMargin)
    {
        new Ext4.Button({
            renderTo: id + "-exportToPDFbutton",
            svgDivId: id,
            svgDivIds: ids,
            icon: LABKEY.contextPath + "/_icons/pdf.gif",
            tooltip: {
                text: title,
                mouseOffset: [-150,-70]
            },
            margin: '0, 10, 0 10',
            handler: function (btn)
            {
                if (isMenu)
                {
                    this.getExportPlotToPDFMenu(btn.svgDivIds, filename, extraMargin).showBy(btn, 'tr-br?');
                }
                else
                {
                    LABKEY.vis.SVGConverter.convert(this.getExportSVGStr(btn.svgDivId, extraMargin), LABKEY.vis.SVGConverter.FORMAT_PDF, filename);
                }
            },
            scope: this
        });
    },

    getExportSVGStr: function(svgDivId, extraWidth)
    {
        var svgEls = Ext4.get(svgDivId).select('svg');
        var targetSvg = svgEls.elements[0];
        var oldWidth = targetSvg.getBoundingClientRect().width;
        // temporarily increase svg size to allow exporting of legends that's outside svg
        if (extraWidth)
            targetSvg.setAttribute('width', oldWidth + extraWidth);
        var svgStr = LABKEY.vis.SVGConverter.svgToStr(targetSvg);
        if (extraWidth)
            targetSvg.setAttribute('width', oldWidth);
        svgStr = svgStr.replace(/visibility="hidden"/g, 'visibility="visible"');
        return svgStr;
    },

    failureHandler: function(response) {
        if (response.message) {
            Ext4.get(this.plotDivId).update("<span>" + response.message +"</span>");
        }
        else {
            Ext4.get(this.plotDivId).update("<span class='labkey-error'>Error: " + response.exception + "</span>");
        }

        Ext4.get(this.plotDivId).unmask();
    },

    queryInitialQcMetrics : function(successCallback,callbackScope) {
        LABKEY.Ajax.request({
            url: LABKEY.ActionURL.buildURL('targetedms', 'GetQCMetricConfigurations.api'),
            method: 'GET',
            success: function(response) {
                this.metricPropArr = Ext4.JSON.decode(response.responseText).configurations;
                successCallback.call(callbackScope);
            },
            failure: LABKEY.Utils.getCallbackWrapper(function(response) {
                this.failureHandler(response);
            }, null, true),
            scope: this
        });
    }
});

