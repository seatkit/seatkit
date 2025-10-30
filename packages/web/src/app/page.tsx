export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-24">
			<div className="text-center">
				<h1 className="text-4xl font-bold mb-4">SeatKit</h1>
				<p className="text-xl text-gray-600 mb-8">
					Restaurant Reservation Management System
				</p>
				<div className="flex gap-4 justify-center">
					<a
						href="/reservations"
						className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
					>
						View Reservations
					</a>
				</div>
			</div>
		</main>
	);
}
