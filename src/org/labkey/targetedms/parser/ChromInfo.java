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

package org.labkey.targetedms.parser;

/**
 * User: vsharma
 * Date: 4/22/12
 * Time: 4:52 PM
 */
public class ChromInfo<AnnotationType extends AbstractAnnotation> extends AnnotatedEntity<AnnotationType>
{
    private String _replicateName;
    private String _skylineSampleFileId;
    private int _sampleFileId;

    public String getSkylineSampleFileId()
    {
        return _skylineSampleFileId;
    }

    public void setSkylineSampleFileId(String skylineSampleFileId)
    {
        _skylineSampleFileId = skylineSampleFileId;
    }

    public String getReplicateName()
    {
        return _replicateName;
    }

    public void setReplicateName(String replicateName)
    {
        _replicateName = replicateName;
    }

    public int getSampleFileId()
    {
        return _sampleFileId;
    }

    public void setSampleFileId(int sampleFileId)
    {
        _sampleFileId = sampleFileId;
    }
}
