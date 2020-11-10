/*
 * Copyright (c) 2013-2019 LabKey Corporation
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
package org.labkey.targetedms.chromlib;

import org.labkey.api.protein.ProteinService;
import org.labkey.targetedms.parser.PeptideGroup;

/**
 * User: vsharma
 * Date: 12/31/12
 * Time: 9:22 AM
 */
public class LibProtein extends AbstractLibList<LibPeptide>
{
    public LibProtein() {}

    public LibProtein(PeptideGroup pepGroup)
    {
        super(pepGroup);
        if(pepGroup.getSequenceId() != null)
        {
            setSequence(ProteinService.get().getProteinSequence(pepGroup.getSequenceId()));
        }
        else
        {
            setSequence(pepGroup.getSequence());
        }
    }

    private String _sequence;

    public String getSequence()
    {
        return _sequence;
    }

    public void setSequence(String sequence)
    {
        _sequence = sequence;
    }
}
