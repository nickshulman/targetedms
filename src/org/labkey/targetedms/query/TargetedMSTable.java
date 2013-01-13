/*
 * Copyright (c) 2012-2013 LabKey Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.labkey.targetedms.query;

import org.labkey.api.data.ContainerFilter;
import org.labkey.api.data.SQLFragment;
import org.labkey.api.data.TableInfo;
import org.labkey.api.query.FieldKey;
import org.labkey.api.query.FilteredTable;
import org.labkey.targetedms.TargetedMSSchema;

/**
 * User: jeckels
 * Date: Apr 19, 2012
 */
public class TargetedMSTable extends FilteredTable<TargetedMSSchema>
{
    private final SQLFragment _containerSQL;
    private static final FieldKey CONTAINER_FAKE_COLUMN_NAME = FieldKey.fromParts("Container");

    public TargetedMSTable(TableInfo table, TargetedMSSchema schema, SQLFragment containerSQL)
    {
        super(table, schema);
        _containerSQL = containerSQL;
        wrapAllColumns(true);
        applyContainerFilter(getContainerFilter());
    }

    @Override
    protected void applyContainerFilter(ContainerFilter filter)
    {
        clearConditions(CONTAINER_FAKE_COLUMN_NAME);
        if (_containerSQL != null)
        {
            addCondition(filter.getSQLFragment(getSchema(), _containerSQL, getContainer()), CONTAINER_FAKE_COLUMN_NAME);
        }
    }
}
