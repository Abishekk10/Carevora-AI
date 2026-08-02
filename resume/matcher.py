from models.job import Job


def calculate_match_score(resume_skills: list, job: Job):
    """
    Calculates how well a resume matches a job.
    """

    resume_set = {skill.lower() for skill in resume_skills}
    job_set = {skill.lower() for skill in job.skills}

    matched = resume_set.intersection(job_set)

    if len(job_set) == 0:
        return {
            "match_score": 0,
            "matched_skills": [],
            "missing_skills": []
        }

    score = round((len(matched) / len(job_set)) * 100)

    return {
        "match_score": score,
        "matched_skills": sorted(list(matched)),
        "missing_skills": sorted(list(job_set - matched))
    }