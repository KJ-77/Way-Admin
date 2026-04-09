import { useTutors } from "@/hooks/use-tutors"
import TutorsGrid from "@/components/tutors/tutors-grid"

const TutorsPage = () => {
  const {
    tutors, loading, error, refetch,
    createTutor, updateTutor, deleteTutor,
  } = useTutors()

  return (
    <div className="space-y-6">
      <TutorsGrid
        tutors={tutors}
        loading={loading}
        error={error}
        onRefetch={refetch}
        onCreateTutor={createTutor}
        onUpdateTutor={updateTutor}
        onDeleteTutor={deleteTutor}
      />
    </div>
  )
}

export default TutorsPage
