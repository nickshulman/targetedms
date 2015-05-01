package org.labkey.test.tests;

import org.apache.commons.lang3.tuple.Pair;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.experimental.categories.Category;
import org.labkey.test.Locator;
import org.labkey.test.categories.DailyB;
import org.labkey.test.categories.MS2;
import org.labkey.test.components.targetedms.GuideSet;
import org.labkey.test.components.targetedms.GuideSetStats;
import org.labkey.test.components.targetedms.GuideSetWebPart;
import org.labkey.test.components.targetedms.QCPlotsWebPart;
import org.labkey.test.pages.targetedms.PanoramaDashboard;
import org.labkey.test.util.DataRegionTable;
import org.openqa.selenium.WebElement;

import java.util.ArrayList;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

/**
 * Created by cnathe on 4/30/15.
 */
@Category({DailyB.class, MS2.class})
public class TargetedMSQCGuideSetTest extends TargetedMSTest
{
    private static final String SProCoP_FILE = "SProCoPTutorial.zip";
    private static final String[] PRECURSORS = {
            "ATEEQLK",
            "FFVAPFPEVFGK",
            "GASIVEDK",
            "LVNELTEFAK",
            "VLDALDSIK",
            "VLVLDTDYK",
            "VYVEELKPTPEGDLEILLQK"};

    private static GuideSet gs1 = new GuideSet("2013-08-01", "2013-08-01 00:00:01", "first guide set, entirely before initial data with no data points in range");
    private static GuideSet gs2 = new GuideSet("2013-08-02", "2013-08-11", "second guide set, starts before initial data start date with only one data point in range");
    private static GuideSet gs3 = new GuideSet("2013-08-14 22:48:37", "2013-08-16 20:26:28", "third guide set, ten data points in range");
    private static GuideSet gs4 = new GuideSet("2013-08-21 07:00", "2013-08-21 14:00", "fourth guide set, four data points in range");
    private static GuideSet gs5 = new GuideSet("2013-08-27 03:19:45", "2013-08-31 00:00:00", "fifth guide set, extends beyond last initial data point with two data points in range");


    @Override
    protected String getProjectName()
    {
        return getClass().getSimpleName() + " Project";
    }

    @BeforeClass
    public static void initProject()
    {
        TargetedMSQCGuideSetTest init = (TargetedMSQCGuideSetTest)getCurrentTest();

        init.setupFolder(FolderType.QC);
        init.importData(SProCoP_FILE);

        init.createGuideSet(gs1);
        init.createGuideSet(gs2);
        init.createGuideSet(gs3);
        init.createGuideSet(gs4);
        init.createGuideSet(gs5);
    }

    @Before
    public void preTest()
    {
        goToProjectHome();
    }

    @Test
    public void testGuideSetStats()
    {
        // verify guide set mean/std dev/num records from SQL queries
        verifyGuideSet1Stats(gs1);
        verifyGuideSet2Stats(gs2);
        verifyGuideSet3Stats(gs3);
        verifyGuideSet4Stats(gs4);
        verifyGuideSet5Stats(gs5);
    }

    @Test
    public void testGuideSetTableValidation()
    {
        createGuideSet(new GuideSet("2013-08-10 00:00:01", "2013-08-10 00:00:00", null), "The training start date/time must be before the training end date/time.");
        createGuideSet(new GuideSet("2013-08-01", "2013-08-12", null), "The training date range overlaps with an existing guide set's training date range.");
        createGuideSet(new GuideSet("2013-08-01", "2013-08-03", null), "The training date range overlaps with an existing guide set's training date range.");
        createGuideSet(new GuideSet("2013-08-10", "2013-08-12", null), "The training date range overlaps with an existing guide set's training date range.");
    }

    @Test
    public void testGuideSetPlotDisplay()
    {
        String circle = "M0,3A", triangle = "M0,3L", square = "M-3", diamond = "M0 3";

        PanoramaDashboard qcDashboard = new PanoramaDashboard(this);
        QCPlotsWebPart qcPlotsWebPart = qcDashboard.getQcPlotsWebPart();

        // 4 of the 5 guide sets are visible in plot region based on the initial data
        List<Pair<String, Integer>> shapeCounts = new ArrayList<>();
        shapeCounts.add(Pair.of(circle, 4));
        shapeCounts.add(Pair.of(triangle, 23));
        shapeCounts.add(Pair.of(square, 18));
        shapeCounts.add(Pair.of(diamond, 2));
        verifyGuideSetRelatedElementsForPlots(qcPlotsWebPart, 4, shapeCounts, 47);

        // check box for group x-axis values by date and verify
        qcPlotsWebPart.setGroupXAxisValuesByDate(true);
        verifyGuideSetRelatedElementsForPlots(qcPlotsWebPart, 4, shapeCounts, 17);
        qcPlotsWebPart.setGroupXAxisValuesByDate(false);

        // filter plot by start/end date to check reference points without training points in view
        qcPlotsWebPart.filterQCPlots("2013-08-19", "2013-08-19", PRECURSORS.length);
        shapeCounts = new ArrayList<>();
        shapeCounts.add(Pair.of(circle, 2));
        shapeCounts.add(Pair.of(triangle, 0));
        verifyGuideSetRelatedElementsForPlots(qcPlotsWebPart, 0, shapeCounts, 2);
    }

    private void verifyGuideSetRelatedElementsForPlots(QCPlotsWebPart qcPlotsWebPart, int visibleTrainingRanges, List<Pair<String, Integer>> shapeCounts, int axisTickCount)
    {
        for (Pair<String, Integer> shapeCount : shapeCounts)
        {
            verifyGuideSetPointShapeCounts(qcPlotsWebPart, shapeCount.getRight() * PRECURSORS.length, shapeCount.getLeft());
        }

        assertEquals("Unexpected number of training range rects visible", visibleTrainingRanges * PRECURSORS.length, qcPlotsWebPart.getGuideSetTrainingRectCount());
        assertEquals("Unexpected number of error bar elements", axisTickCount * PRECURSORS.length * 4, qcPlotsWebPart.getGuideSetErrorBarPathCount("error-bar-vert"));
    }

    private void verifyGuideSetPointShapeCounts(QCPlotsWebPart qcPlot, int expectedCount, String pathPrefix)
    {
        List<WebElement> points = qcPlot.getPointElements();
        int count = 0;
        for (WebElement p : points)
        {
            if (p.getAttribute("d").startsWith(pathPrefix))
                count++;
        }

        assertEquals("Unexpected guide set shape count for " + pathPrefix, expectedCount, count);
    }

    private void validateGuideSetStats(GuideSet gs)
    {
        for (GuideSetStats stats : gs.getStats())
        {
            navigateToQuery("targetedms", stats.getQueryName());

            DataRegionTable table = new DataRegionTable("query", this);
            table.setFilter("GuideSetId", "Equals", String.valueOf(gs.getRowId()));
            if (stats.getPrecursor() != null)
                table.setFilter("Sequence", "Equals", stats.getPrecursor());
            else
                table.setFilter("Sequence", "Is Blank", null);

            assertEquals("Unexpected number of filtered rows", 1, table.getDataRowCount());
            assertEquals("Unexpected guide set stats record count", stats.getNumRecords(), Integer.parseInt(table.getDataAsText(0, "NumRecords")));

            if (stats.getMean() != null)
                assertEquals("Unexpected guide set stats mean", stats.getMean(), Double.parseDouble(table.getDataAsText(0, "Mean")), 0.0005);
            else
                assertNull("Unexpected guide set stats mean", stats.getMean());

            if (stats.getStdDev() != null)
                assertEquals("Unexpected guide set stats std dev", stats.getStdDev(), Double.parseDouble(table.getDataAsText(0, "StandardDev")), 0.0005);
            else
                assertNull("Unexpected guide set stats std dev", stats.getStdDev());
        }
    }

    private void verifyGuideSet1Stats(GuideSet gs)
    {
        gs.addStats(new GuideSetStats("GuideSetRetentionTimeStats", 0));
        gs.addStats(new GuideSetStats("GuideSetPeakAreaStats", 0));
        gs.addStats(new GuideSetStats("GuideSetFWHMStats", 0));
        gs.addStats(new GuideSetStats("GuideSetFWBStats", 0));
        gs.addStats(new GuideSetStats("GuideSetLHRatioStats", 0));

        validateGuideSetStats(gs);
    }

    private void verifyGuideSet2Stats(GuideSet gs)
    {
        gs.addStats(new GuideSetStats("GuideSetRetentionTimeStats", 1, PRECURSORS[0], 14.880, null));
        gs.addStats(new GuideSetStats("GuideSetPeakAreaStats", 1, PRECURSORS[0], 1.1613580288E10, null));
        gs.addStats(new GuideSetStats("GuideSetFWHMStats", 1, PRECURSORS[0], 0.096, null));
        gs.addStats(new GuideSetStats("GuideSetFWBStats", 1, PRECURSORS[0], 0.292, null));
        gs.addStats(new GuideSetStats("GuideSetLHRatioStats", 0));

        validateGuideSetStats(gs);
    }

    private void verifyGuideSet3Stats(GuideSet gs)
    {
        gs.addStats(new GuideSetStats("GuideSetRetentionTimeStats", 10, PRECURSORS[1], 32.151, 0.026));
        gs.addStats(new GuideSetStats("GuideSetPeakAreaStats", 10, PRECURSORS[1], 2.930734907392E11, 6.454531590675328E10));
        gs.addStats(new GuideSetStats("GuideSetFWHMStats", 10, PRECURSORS[1], 0.11, 0.015));
        gs.addStats(new GuideSetStats("GuideSetFWBStats", 10, PRECURSORS[1], 0.326, 0.025));
        gs.addStats(new GuideSetStats("GuideSetLHRatioStats", 0));

        validateGuideSetStats(gs);
    }

    private void verifyGuideSet4Stats(GuideSet gs)
    {
        gs.addStats(new GuideSetStats("GuideSetRetentionTimeStats", 4, PRECURSORS[2], 14.031, 0.244));
        gs.addStats(new GuideSetStats("GuideSetPeakAreaStats", 4, PRECURSORS[2], 1.1564451072E10, 1.5713155146840603E9));
        gs.addStats(new GuideSetStats("GuideSetFWHMStats", 4, PRECURSORS[2], 0.088, 0.006));
        gs.addStats(new GuideSetStats("GuideSetFWBStats", 4, PRECURSORS[2], 0.259, 0.013));
        gs.addStats(new GuideSetStats("GuideSetLHRatioStats", 0));

        validateGuideSetStats(gs);
    }

    private void verifyGuideSet5Stats(GuideSet gs)
    {
        gs.addStats(new GuideSetStats("GuideSetRetentionTimeStats", 2, PRECURSORS[3], 24.581, 0.011));
        gs.addStats(new GuideSetStats("GuideSetPeakAreaStats", 2, PRECURSORS[3], 5.6306905088E10, 1.5347948865359387E9));
        gs.addStats(new GuideSetStats("GuideSetFWHMStats", 2, PRECURSORS[3], 0.072, 0.009));
        gs.addStats(new GuideSetStats("GuideSetFWBStats", 2, PRECURSORS[3], 0.219, 0.011));
        gs.addStats(new GuideSetStats("GuideSetLHRatioStats", 0));

        validateGuideSetStats(gs);
    }

    private void createGuideSet(GuideSet guideSet)
    {
        createGuideSet(guideSet, null);
    }

    private void createGuideSet(GuideSet guideSet, String expectErrorMsg)
    {
        if (!"Guide Sets".equals(getUrlParam("pageId", true)))
            clickTab("Guide Sets");

        GuideSetWebPart guideSetWebPart = new GuideSetWebPart(this);
        guideSetWebPart.startInsert().insert(guideSet);

        if (expectErrorMsg != null)
        {
            assertElementPresent(Locator.tagWithClass("font", "labkey-error").withText(expectErrorMsg));
            return;
        }

        // get the new guide set RowIds
        DataRegionTable table = guideSetWebPart.getDataRegion();
        if (table.getColumn("RowId") == -1)
        {
            _customizeViewsHelper.openCustomizeViewPanel();
            _customizeViewsHelper.showHiddenItems();
            _customizeViewsHelper.addCustomizeViewColumn("RowId");
            _customizeViewsHelper.applyCustomView();
        }
        String rowIdStr = table.getDataAsText(table.getRow("Comment", guideSet.getComment()), "RowId");
        guideSet.setRowId(Integer.parseInt(rowIdStr));
    }
}