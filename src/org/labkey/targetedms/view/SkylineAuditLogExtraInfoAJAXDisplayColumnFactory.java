package org.labkey.targetedms.view;

import org.json.JSONObject;
import org.labkey.api.data.AJAXDetailsDisplayColumn;
import org.labkey.api.data.ColumnInfo;
import org.labkey.api.data.Container;
import org.labkey.api.data.DisplayColumn;
import org.labkey.api.data.DisplayColumnFactory;
import org.labkey.api.data.RenderContext;
import org.labkey.api.query.FieldKey;
import org.labkey.api.view.ActionURL;
import org.labkey.targetedms.TargetedMSController;

import java.io.IOException;
import java.io.Writer;
import java.util.HashMap;
import java.util.Map;

public class SkylineAuditLogExtraInfoAJAXDisplayColumnFactory implements DisplayColumnFactory
{
    @Override
    public DisplayColumn createRenderer(ColumnInfo colInfo)
    {
        Container c = colInfo.getParentTable().getUserSchema().getContainer();
        FieldKey seqIdFK = new FieldKey(colInfo.getFieldKey().getParent(), "entryId");
        Map<String, FieldKey> params = new HashMap<>();
        params.put("entryId", seqIdFK);
        JSONObject props = new JSONObject();
        props.put("width", 350);
        return new AJAXDetailsDisplayColumn(colInfo, new ActionURL(TargetedMSController.ShowSkylineAuditLogExtraInfoAJAXAction.class, c), params, props)
        {
            private boolean _renderedCSS = false;

            @Override
            public void renderGridCellContents(RenderContext ctx, Writer out) throws IOException
            {
                if (!_renderedCSS)
                {
                    out.write("<script type=\"text/javascript\">\n" +
                            "LABKEY.requiresScript(\"util.js\");\n" +
                            "</script>");
                    _renderedCSS = true;
                }
                super.renderGridCellContents(ctx, out);
            }
        };
    }

}
