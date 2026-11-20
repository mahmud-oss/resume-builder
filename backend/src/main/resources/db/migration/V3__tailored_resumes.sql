-- A tailored version of a resume points at the original it was made from. Deleting the original keeps its
-- versions: they become ordinary standalone resumes. Only an original (tailored_from IS NULL) can be tailored;
-- the application enforces that, since a CHECK cannot look at another row.
ALTER TABLE resumes ADD COLUMN tailored_from UUID REFERENCES resumes (id) ON DELETE SET NULL;

CREATE INDEX idx_resumes_tailored_from ON resumes (tailored_from) WHERE tailored_from IS NOT NULL;
