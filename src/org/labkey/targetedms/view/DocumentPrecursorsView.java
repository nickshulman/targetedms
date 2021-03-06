/*
 * Copyright (c) 2012-2018 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.labkey.targetedms.view;

import org.labkey.api.query.QueryNestingOption;
import org.labkey.api.view.ViewContext;
import org.labkey.targetedms.TargetedMSSchema;

import java.sql.SQLException;

/**
 * User: vsharma
 * Date: 4/17/12
 * Time: 10:52 PM
 */
public abstract class DocumentPrecursorsView extends DocumentView
{
    protected TargetedMSSchema _targetedMsSchema = null;
    protected final String _tableName;

    public DocumentPrecursorsView(ViewContext ctx, TargetedMSSchema schema, String queryName, int runId, boolean forExport,
                                  QueryNestingOption nestingOption, String dataRegionName)
    {
        super(ctx, schema, queryName, runId, !forExport, nestingOption, dataRegionName);
        _targetedMsSchema = schema;
        _tableName = queryName;
    }

}
