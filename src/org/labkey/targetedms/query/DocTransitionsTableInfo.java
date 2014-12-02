/*
 * Copyright (c) 2012-2014 LabKey Corporation
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

package org.labkey.targetedms.query;

import org.labkey.api.data.ColumnInfo;
import org.labkey.api.data.DisplayColumn;
import org.labkey.api.data.DisplayColumnFactory;
import org.labkey.api.data.JdbcType;
import org.labkey.api.data.SQLFragment;
import org.labkey.api.data.TableInfo;
import org.labkey.api.data.WrappedColumn;
import org.labkey.api.query.ExprColumn;
import org.labkey.api.query.FieldKey;
import org.labkey.api.query.LookupForeignKey;
import org.labkey.targetedms.TargetedMSManager;
import org.labkey.targetedms.TargetedMSSchema;
import org.labkey.targetedms.view.AnnotationUIDisplayColumn;

import java.util.ArrayList;

/**
 * User: vsharma
 * Date: Apr 13, 2012
 */
public class DocTransitionsTableInfo extends AnnotatedTargetedMSTable
{
    public DocTransitionsTableInfo(final TargetedMSSchema schema)
    {
        super(TargetedMSManager.getTableInfoTransition(),
              schema,
              TargetedMSSchema.ContainerJoinType.PrecursorFK.getSQL(),
              TargetedMSManager.getTableInfoTransitionAnnotation(), "TransitionId",
              "Annotations");

        setName(TargetedMSSchema.TABLE_TRANSITION);

        ColumnInfo precursorCol = getColumn("PrecursorId");
        precursorCol.setFk(new LookupForeignKey("Id")
        {
            @Override
            public TableInfo getLookupTableInfo()
            {
                return _userSchema.getTable(TargetedMSSchema.TABLE_PRECURSOR);
            }
        });

        // Display the fragment as y9 instead of 'y' and '9' in separate columns
        StringBuilder sql = new StringBuilder();
        sql.append(" CASE WHEN ");
        sql.append(ExprColumn.STR_TABLE_ALIAS).append(".FragmentType != 'precursor'");
        sql.append(" THEN ");
        sql.append(TargetedMSManager.getSqlDialect().concatenate(ExprColumn.STR_TABLE_ALIAS + ".FragmentType",
                                                                 "CAST(" + ExprColumn.STR_TABLE_ALIAS+".FragmentOrdinal AS VARCHAR)"));
        sql.append(" ELSE ");
        sql.append("CASE WHEN ");
        sql.append(ExprColumn.STR_TABLE_ALIAS).append(".MassIndex != 0");
        sql.append(" THEN ");
        sql.append(TargetedMSManager.getSqlDialect().concatenate("'M+'","CAST(" + ExprColumn.STR_TABLE_ALIAS+".MassIndex AS VARCHAR)"));
        sql.append(" ELSE ");
        sql.append("'M'");
        sql.append(" END ");
        sql.append(" END ");
        SQLFragment fragmentSql = new SQLFragment(sql.toString());
        ColumnInfo fragment = new ExprColumn(this, "Fragment", fragmentSql, JdbcType.VARCHAR);
        fragment.setTextAlign("Left");
        fragment.setJdbcType(JdbcType.VARCHAR);
        addColumn(fragment);


        ArrayList<FieldKey> visibleColumns = new ArrayList<>();
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "PeptideId", "PeptideGroupId", "Label"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "PeptideId", "PeptideGroupId", "Description"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "PeptideId", "PeptideGroupId", "Annotations"));

        // Peptide level information
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "PeptideId", ModifiedSequenceDisplayColumn.PEPTIDE_COLUMN_NAME));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "PeptideId", "Annotations"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "PeptideId", "NumMissedCleavages"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "PeptideId", "CalcNeutralMass"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "PeptideId", "Rank"));


        // Precursor level information
        visibleColumns.add(FieldKey.fromParts("PrecursorId", ModifiedSequenceDisplayColumn.PRECURSOR_COLUMN_NAME));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "Annotations"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "IsotopeLabelId", "Name"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "NeutralMass"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "Mz"));
        visibleColumns.add(FieldKey.fromParts("PrecursorId", "Charge"));

        // Transition level information
        visibleColumns.add(FieldKey.fromParts("Fragment"));
        visibleColumns.add(FieldKey.fromParts("Mz"));
        visibleColumns.add(FieldKey.fromParts("Charge"));

        setDefaultVisibleColumns(visibleColumns);

        // Create a WrappedColumn for Note & Annotations
        WrappedColumn noteAnnotation = new WrappedColumn(getColumn("Annotations"), "NoteAnnotations");
        noteAnnotation.setDisplayColumnFactory(new DisplayColumnFactory()
        {
            @Override
            public DisplayColumn createRenderer(ColumnInfo colInfo)
            {
                return new AnnotationUIDisplayColumn(colInfo);
            }
        });
        noteAnnotation.setLabel("Transition Note/Annotations");
        addColumn(noteAnnotation);

    }

    public void setRunId(int runId)
    {
        addRunFilter(runId);
    }

    public void addRunFilter(int runId)
    {
        getFilter().deleteConditions(FieldKey.fromParts("Run"));
        SQLFragment sql = new SQLFragment();
        sql.append("Id IN ");

        sql.append("(SELECT trans.Id FROM ");
        sql.append(TargetedMSManager.getTableInfoTransition(), "trans");
        sql.append(" INNER JOIN ");
        sql.append(TargetedMSManager.getTableInfoPrecursor(), "prec");
        sql.append(" ON (trans.PrecursorId=prec.Id) ");
        sql.append(" INNER JOIN ");
        sql.append(TargetedMSManager.getTableInfoPeptide(), "pep");
        sql.append(" ON (prec.PeptideId=pep.Id) ");
        sql.append("INNER JOIN ");
        sql.append(TargetedMSManager.getTableInfoPeptideGroup(), "pg");
        sql.append(" ON (pep.PeptideGroupId=pg.Id) ");
        sql.append("WHERE pg.RunId=? ");
        sql.append(")");

        sql.add(runId);

        addCondition(sql, FieldKey.fromParts("Run"));
    }
}