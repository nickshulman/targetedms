/*
 * Copyright (c) 2013-2014 LabKey Corporation
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

import org.labkey.api.data.ColumnInfo;
import org.labkey.api.data.TableInfo;
import org.labkey.api.query.DetailsURL;
import org.labkey.api.query.FieldKey;
import org.labkey.api.query.LookupForeignKey;
import org.labkey.api.util.ContainerContext;
import org.labkey.api.view.ActionURL;
import org.labkey.targetedms.TargetedMSController;
import org.labkey.targetedms.TargetedMSManager;
import org.labkey.targetedms.TargetedMSSchema;

import java.util.ArrayList;
import java.util.Collections;

/**
 * User: binalpatel
 * Date: 02/23/2016
 */

public class MoleculePrecursorTableInfo extends AbstractGeneralPrecursorTableInfo
{
    public MoleculePrecursorTableInfo(final TargetedMSSchema schema)
    {
        this(TargetedMSManager.getTableInfoMoleculePrecursor(), TargetedMSSchema.TABLE_MOLECULE_PRECURSOR, schema);
    }

    public MoleculePrecursorTableInfo(final TableInfo tableInfo, String tableName, final TargetedMSSchema schema)
    {
        super(tableInfo, tableName, schema);

        ColumnInfo generalMoleculeId = getColumn("GeneralMoleculeId");
        generalMoleculeId.setFk(new LookupForeignKey("Id")
        {
            @Override
            public TableInfo getLookupTableInfo()
            {
                return _userSchema.getTable(TargetedMSSchema.TABLE_MOLECULE);
            }
        });
        generalMoleculeId.setHidden(true);

        ColumnInfo moleculeIdId = wrapColumn("MoleculeId", getRealTable().getColumn(generalMoleculeId.getFieldKey()));
        moleculeIdId.setFk(new LookupForeignKey("Id")
        {
            @Override
            public TableInfo getLookupTableInfo()
            {
                return _userSchema.getTable(TargetedMSSchema.TABLE_MOLECULE);
            }
        });
        addColumn(moleculeIdId);

        ArrayList<FieldKey> visibleColumns = new ArrayList<>();
        visibleColumns.add(FieldKey.fromParts("MoleculeId", "PeptideGroupId", "Label"));
        visibleColumns.add(FieldKey.fromParts("MoleculeId", "PeptideGroupId", "Description"));
        visibleColumns.add(FieldKey.fromParts("MoleculeId", "PeptideGroupId", "NoteAnnotations"));
        visibleColumns.add(FieldKey.fromParts("MoleculeId", "CustomIonName"));
        visibleColumns.add(FieldKey.fromParts("MoleculeId", "IonFormula"));
        visibleColumns.add(FieldKey.fromParts("Charge"));
        visibleColumns.add(FieldKey.fromParts("Mz"));
        visibleColumns.add(FieldKey.fromParts("CollisionEnergy"));
        visibleColumns.add(FieldKey.fromParts("MassMonoisotopic"));
        visibleColumns.add(FieldKey.fromParts("MassAverage"));
        visibleColumns.add(FieldKey.fromParts("CollisionEnergy"));
        visibleColumns.add(FieldKey.fromParts("TransitionCount"));

        setDefaultVisibleColumns(visibleColumns);
    }

}