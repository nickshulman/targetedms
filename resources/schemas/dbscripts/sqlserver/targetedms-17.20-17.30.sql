/*
 * Copyright (c) 2017 LabKey Corporation
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

/* targetedms-17.20-17.21.sql */

ALTER TABLE targetedms.Runs ADD ReplicateCount INT;

GO

UPDATE targetedms.Runs SET ReplicateCount = (SELECT COUNT(r.id) FROM targetedms.Replicate r WHERE r.RunId = targetedms.Runs.Id);

/* targetedms-17.21-17.22.sql */

ALTER TABLE targetedms.TransitionChromInfo ADD PointsAcrossPeak INT;