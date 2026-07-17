import { EventDetail } from "../../../components/event-detail";
import { SiteChrome } from "../../../components/site-chrome";
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SiteChrome><EventDetail id={id} /></SiteChrome>; }
