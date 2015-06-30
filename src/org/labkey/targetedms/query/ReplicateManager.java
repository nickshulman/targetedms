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

import org.labkey.api.data.SQLFragment;
import org.labkey.api.data.SimpleFilter;
import org.labkey.api.data.SqlSelector;
import org.labkey.api.data.TableSelector;
import org.labkey.api.query.FieldKey;
import org.labkey.targetedms.TargetedMSManager;
import org.labkey.targetedms.TargetedMSSchema;
import org.labkey.targetedms.parser.Replicate;
import org.labkey.targetedms.parser.ReplicateAnnotation;
import org.labkey.targetedms.parser.SampleFile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * User: vsharma
 * Date: 5/2/12
 * Time: 1:54 PM
 */
public class ReplicateManager
{
    private ReplicateManager() {}

    public static SampleFile getSampleFile(int sampleFileId)
    {
        return new TableSelector(TargetedMSManager.getSchema().getTable(TargetedMSSchema.TABLE_SAMPLE_FILE))
            .getObject(sampleFileId, SampleFile.class);
    }

    public static Replicate getReplicate(int replicateId)
    {
        return new TableSelector(TargetedMSManager.getSchema().getTable(TargetedMSSchema.TABLE_REPLICATE))
            .getObject(replicateId, Replicate.class);
    }

    public static SampleFile getSampleFileForPrecursorChromInfo(int precursorChromInfoId)
    {
        String sql = "SELECT sf.* FROM "+
                     TargetedMSManager.getTableInfoSampleFile()+" AS sf, "+
                     TargetedMSManager.getTableInfoPrecursorChromInfo()+" AS pci "+
                     "WHERE sf.Id=pci.SampleFileId "+
                     "AND pci.Id=?";
        SQLFragment sf = new SQLFragment(sql);
        sf.add(precursorChromInfoId);

        return new SqlSelector(TargetedMSManager.getSchema(), sf).getObject(SampleFile.class);
    }

    public static SampleFile getSampleFileForPeptideChromInfo(int peptideChromInfoId)
    {
        String sql = "SELECT sf.* FROM "+
                     TargetedMSManager.getTableInfoSampleFile()+" AS sf, "+
                     TargetedMSManager.getTableInfoPeptideChromInfo()+" AS pci "+
                     "WHERE sf.Id=pci.SampleFileId "+
                     "AND pci.Id=?";
        SQLFragment sf = new SQLFragment(sql);
        sf.add(peptideChromInfoId);

        return new SqlSelector(TargetedMSManager.getSchema(), sf).getObject(SampleFile.class);
    }

    public static List<SampleFile> getSampleFilesForRun(int runId)
    {
        String sql = "SELECT sf.* FROM "+
                     TargetedMSManager.getTableInfoSampleFile()+" AS sf, "+
                     TargetedMSManager.getTableInfoReplicate()+" AS rep "+
                     "WHERE rep.Id=sf.ReplicateId "+
                     "AND rep.RunId=?";
        SQLFragment sf = new SQLFragment(sql);
        sf.add(runId);

        return new ArrayList<>(new SqlSelector(TargetedMSManager.getSchema(), sf).getCollection(SampleFile.class));
    }

    public static List<Replicate> getReplicatesForRun(int runId)
    {
        return new ArrayList<>(
                                 new TableSelector(TargetedMSManager.getTableInfoReplicate(),
                                                   new SimpleFilter(FieldKey.fromParts("RunId"), runId),
                                                   null)
                                 .getCollection(Replicate.class));
    }

    public static List<String> getReplicateAnnotationNamesForRun(int runId)
    {
        SQLFragment sql = new SQLFragment();
        sql.append("SELECT DISTINCT replAnnot.Name FROM ");
        sql.append(TargetedMSManager.getTableInfoReplicate(), "repl");
        sql.append(", ");
        sql.append(TargetedMSManager.getTableInfoReplicateAnnotation(), "replAnnot");
        sql.append(" WHERE ");
        sql.append(" repl.RunID = ? ");
        sql.append(" AND repl.Id = replAnnot.ReplicateId ");
        sql.add(runId);

        return new ArrayList<>(new SqlSelector(TargetedMSManager.getSchema(), sql).getCollection(String.class));
    }

    public static List<ReplicateAnnotation> getReplicateAnnotationsForRun(int runId)
    {
        SQLFragment sql = new SQLFragment();
        sql.append("SELECT replAnnot.* FROM ");
        sql.append(TargetedMSManager.getTableInfoReplicate(), "repl");
        sql.append(", ");
        sql.append(TargetedMSManager.getTableInfoReplicateAnnotation(), "replAnnot");
        sql.append(" WHERE ");
        sql.append(" repl.RunID = ? ");
        sql.append(" AND repl.Id = replAnnot.ReplicateId ");
        sql.add(runId);

        return new ArrayList<>(new SqlSelector(TargetedMSManager.getSchema(), sql).getCollection(ReplicateAnnotation.class));
    }

    public static List<ReplicateAnnotation> getUniqueSortedAnnotationNameValue(int runId)
    {
        List<ReplicateAnnotation> allAnnotationsList = getReplicateAnnotationsForRun(runId);
        Map<String, ReplicateAnnotation> uniqueAnnotationsMap = new HashMap<>();

        for(ReplicateAnnotation annotation: allAnnotationsList)
        {
            uniqueAnnotationsMap.put(annotation.getDisplayName(), annotation);
        }

        List<ReplicateAnnotation> uniqueAnnotationsList = new ArrayList<>(uniqueAnnotationsMap.values());

        //Sorts alphabetically by Name then value if names are same
        Collections.sort(uniqueAnnotationsList, new Comparator<ReplicateAnnotation>()
        {
            public int compare(ReplicateAnnotation o1, ReplicateAnnotation o2)
            {
                //If ReplicateAnnotation.getName() for o1 and o2 are the same sorts by .getValue()
                if (o1.getName().equals(o2.getName()))
                {
                    if (o1.getValue().matches("[-+]?\\d*\\.?\\d+") && o2.getValue().matches("[-+]?\\d*\\.?\\d+"))
                    {
                        return Double.valueOf(o1.getValue()).compareTo(Double.valueOf(o2.getValue()));
                    }
                    else
                    {
                        return o1.getValue().compareTo(o2.getValue());
                    }
                }
                else
                {
                    return o1.getName().compareTo(o2.getName());
                }
            }
        });
        return uniqueAnnotationsList;
    }
}