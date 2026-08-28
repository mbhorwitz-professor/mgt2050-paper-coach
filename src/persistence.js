import { supabase } from "./supabase";

export async function getOrCreatePaperProject(userId) {
  const { data: existing, error: selectError } = await supabase
    .from("paper_projects")
    .select("*")
    .eq("user_id", userId)
    .eq("course_code", "MGT 2050")
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from("paper_projects")
    .insert({
      user_id: userId,
      course_code: "MGT 2050",
      current_stage: 1,
      status: "active",
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return created;
}

export async function loadProjectMessages(projectId) {
  const { data, error } = await supabase
    .from("coach_messages")
    .select("id, stage_number, sender, message_text, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const grouped = {};

  for (const message of data || []) {
    if (!grouped[message.stage_number]) {
      grouped[message.stage_number] = [];
    }

    grouped[message.stage_number].push({
      sender: message.sender,
      text: message.message_text,
    });
  }

  return grouped;
}

export async function saveMessage({
  projectId,
  userId,
  stageNumber,
  sender,
  text,
}) {
  const { error } = await supabase.from("coach_messages").insert({
    project_id: projectId,
    user_id: userId,
    stage_number: stageNumber,
    sender,
    message_text: text,
  });

  if (error) {
    throw error;
  }
}

export async function saveCurrentStage({
  projectId,
  userId,
  stageNumber,
  stageName,
}) {
  const { error: projectError } = await supabase
    .from("paper_projects")
    .update({
      current_stage: stageNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (projectError) {
    throw projectError;
  }

  const { error: stageError } = await supabase
    .from("stage_progress")
    .upsert(
      {
        project_id: projectId,
        user_id: userId,
        stage_number: stageNumber,
        stage_name: stageName,
        status: "in_progress",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "project_id,stage_number",
      }
    );

  if (stageError) {
    throw stageError;
  }
}

export async function markStageCompleted({
  projectId,
  userId,
  stageNumber,
  stageName,
}) {
  const { error } = await supabase
    .from("stage_progress")
    .upsert(
      {
        project_id: projectId,
        user_id: userId,
        stage_number: stageNumber,
        stage_name: stageName,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "project_id,stage_number",
      }
    );

  if (error) {
    throw error;
  }
}
